import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Configure Twilio SMS client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

async function sendSMS(to: string, body: string) {
  if (!twilioClient || !twilioPhone) return;
  try {
    await twilioClient.messages.create({ body, from: twilioPhone, to });
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

    // 2. Grace period: 30 minutes ago
    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const targetHours = thirtyMinAgo.getHours().toString().padStart(2, '0');
    const targetMinutes = thirtyMinAgo.getMinutes().toString().padStart(2, '0');
    const cutoffTime = `${targetHours}:${targetMinutes}:00`;

    console.log(`[Missed Dose] Checking for unlogged medicines before: ${cutoffTime}`);

    // 3. Find medicines scheduled BEFORE the cutoff
    const { data: medicines, error: medError } = await supabase
      .from('medicines')
      .select('id, name, dosage, patient_id, schedule_time')
      .lt('schedule_time', cutoffTime);

    if (medError) throw medError;
    if (!medicines || medicines.length === 0) {
      return NextResponse.json({ message: 'No eligible medicines to check.', count: 0 });
    }

    // 4. Fetch today's logs
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data: todayLogs, error: logError } = await supabase
      .from('logs')
      .select('medicine_id, status')
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay);

    if (logError) throw logError;

    // 5. Filter out medicines already logged
    const loggedMedicineIds = new Set((todayLogs || []).map(l => l.medicine_id));
    const trulyMissed = medicines.filter(m => !loggedMedicineIds.has(m.id));

    if (trulyMissed.length === 0) {
      return NextResponse.json({ message: 'All medicines are logged for today.', count: 0 });
    }

    // 6. Insert 'missed' logs
    const insertPayload = trulyMissed.map(m => ({
      medicine_id: m.id,
      status: 'missed',
    }));

    const { error: insertError } = await supabase.from('logs').insert(insertPayload);
    if (insertError) throw insertError;

    // 7. Alert caregivers via SMS
    // In the dependent model, the caregiver is the patient_id (the account owner).
    // We fetch their phone numbers and alert them about their dependents' missed doses.
    const caregiverIds = [...new Set(trulyMissed.map(m => m.patient_id))];
    
    const { data: caregiverProfiles } = await supabase
      .from('profiles')
      .select('id, phone_number, full_name')
      .in('id', caregiverIds);

    // Also fetch dependent names for the missed medicines
    const dependentIds = [...new Set(trulyMissed.filter(m => m.dependent_id).map(m => m.dependent_id))];
    let dependentMap: Record<string, string> = {};
    if (dependentIds.length > 0) {
      const { data: deps } = await supabase
        .from('dependents')
        .select('id, name')
        .in('id', dependentIds);
      if (deps) {
        deps.forEach(d => { dependentMap[d.id] = d.name; });
      }
    }

    for (const caregiverId of caregiverIds) {
      const caregiver = caregiverProfiles?.find(p => p.id === caregiverId);
      if (!caregiver?.phone_number) continue;

      const caregiverMissedMeds = trulyMissed
        .filter(m => m.patient_id === caregiverId)
        .map(m => {
          const depName = m.dependent_id ? dependentMap[m.dependent_id] : null;
          const forStr = depName ? ` (for ${depName})` : '';
          return `${m.name}${forStr} at ${m.schedule_time.substring(0, 5)}`;
        })
        .join(', ');

      const smsBody = `MedRemind Alert 🚨: Missed medicine(s): ${caregiverMissedMeds}. Please check on them.`;
      await sendSMS(caregiver.phone_number, smsBody);
    }

    return NextResponse.json({
      message: 'Missed doses processed',
      markedAsMissed: trulyMissed.length,
      details: trulyMissed.map(m => m.name),
    });

  } catch (error: any) {
    console.error('[Missed Dose Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
