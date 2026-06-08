import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

// Supabase Service Role client (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:support@medremind.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Configure Twilio SMS client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

/**
 * Helper: Format a Date to HH:MM:00 string
 */
function toTimeString(date: Date): string {
  const timeString = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  let [hr, min] = timeString.split(':');
  if (hr === '24') hr = '00';
  return `${hr}:${min}:00`;
}

/**
 * Helper: Send SMS via Twilio
 */
async function sendSMS(to: string, body: string) {
  if (!twilioClient || !twilioPhone) return;
  try {
    await twilioClient.messages.create({
      body,
      from: twilioPhone,
      to,
    });
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}:`, err);
  }
}

export async function GET(request: Request) {
  try {
    // 1. Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();

    // 2. Build 3 time slots: exact time, +5 min ahead, +10 min ahead
    //    If the cron runs at 14:00, we check for medicines at 14:00, 14:05, and 14:10
    //    This means a medicine at 14:10 gets a reminder at 14:00 (10 min early),
    //    then at 14:05 (5 min early), then at 14:10 (exact time).
    const timeSlots = [
      { offset: 0,  label: '⏰ Time NOW' },
      { offset: 5,  label: '⏳ 5 min reminder' },
      { offset: 10, label: '🔔 10 min reminder' },
    ];

    const timeStrings = timeSlots.map(slot => {
      const future = new Date(now.getTime() + slot.offset * 60 * 1000);
      return { time: toTimeString(future), ...slot };
    });

    console.log(`[Cron] Checking times:`, timeStrings.map(t => t.time));

    // 3. Fetch all medicines matching any of the 3 time slots
    const { data: allMedicines, error: medError } = await supabase
      .from('medicines')
      .select('id, name, dosage, patient_id, schedule_time, dependent_id, dependents(phone)')
      .in('schedule_time', timeStrings.map(t => t.time));

    if (medError) throw medError;

    if (!allMedicines || allMedicines.length === 0) {
      return NextResponse.json({ message: 'No medicines due in the next 10 minutes.', count: 0 });
    }

    // 4. Get unique patient IDs
    const patientIds = [...new Set(allMedicines.map(m => m.patient_id))];

    // 5. Fetch push subscriptions and patient profiles (for caregiver phone numbers)
    const [subsResult, profilesResult] = await Promise.all([
      supabase.from('push_subscriptions').select('*').in('user_id', patientIds),
      supabase.from('profiles').select('id, phone_number').in('id', patientIds),
    ]);

    const subscriptions = subsResult.data || [];
    const profiles = profilesResult.data || [];

    let pushCount = 0;
    let smsCount = 0;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 6. Process each time slot separately
    for (const slot of timeStrings) {
      const medsForSlot = allMedicines.filter(m => m.schedule_time === slot.time);
      if (medsForSlot.length === 0) continue;

      for (const med of medsForSlot) {
        let pushTitle: string;
        let pushBody: string;
        let smsBody: string;

        const medNameStr = `${med.name} (${med.dosage || 'N/A'})`;
        const magicLink = `${siteUrl}/log/${med.id}`;

        if (slot.offset === 0) {
          pushTitle = 'Time for your Medicine! 💊';
          pushBody = `It's time to take: ${medNameStr}`;
          smsBody = `MedRemind: ⏰ Time NOW to take your ${medNameStr}. Click here to confirm: ${magicLink}`;
        } else {
          pushTitle = `Upcoming in ${slot.offset} min 🔔`;
          pushBody = `Get ready to take: ${medNameStr}`;
          smsBody = `MedRemind: Reminder — your ${medNameStr} is due in ${slot.offset} minutes.`;
        }

        // --- Send Push Notification (To Caregiver/App User) ---
        const sub = subscriptions.find(s => s.user_id === med.patient_id);
        if (sub) {
          const payload = JSON.stringify({
            title: pushTitle,
            body: pushBody,
            url: '/dashboard/medicines',
            medicineId: med.id,
          });
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            pushCount++;
          } catch (err: any) {
            console.error(`[Push] Failed for ${med.patient_id}:`, err);
            if (err.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }

        // --- Send SMS (To Dependent or Caregiver) ---
        let targetPhone = null;
        const dep = Array.isArray(med.dependents) ? med.dependents[0] : med.dependents;
        if (med.dependent_id && dep?.phone) {
          targetPhone = dep.phone;
        } else {
          const profile = profiles.find(p => p.id === med.patient_id);
          if (profile?.phone_number) targetPhone = profile.phone_number;
        }

        if (targetPhone) {
          await sendSMS(targetPhone, smsBody);
          smsCount++;
        }
      }
    }

    return NextResponse.json({
      message: 'Multi-reminder cycle processed',
      totalMedicinesFound: allMedicines.length,
      pushNotificationsSent: pushCount,
      smsSent: smsCount,
    });

  } catch (error: any) {
    console.error('[Cron Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
