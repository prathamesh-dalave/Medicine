'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Pill, Check, X } from 'lucide-react';

export default function NotificationChecker() {
  const [medicines, setMedicines] = useState<any[]>([]);
  // Use a ref to keep track of which medicine has been notified today
  // Format: "medicineId_YYYY-MM-DD"
  const notifiedMeds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchMedicines = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('medicines')
        .select('*')
        .eq('patient_id', user.id);
      
      if (data) {
        setMedicines(data);
      }
    };

    fetchMedicines();

    // Check for changes in medicines (e.g., added/deleted) every 5 minutes just to keep it fresh
    const fetchInterval = setInterval(fetchMedicines, 5 * 60 * 1000);
    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    if (medicines.length === 0) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;
      const todayDateString = now.toISOString().split('T')[0];

      medicines.forEach((med) => {
        // If medicine has a start/end date, ensure we are within range
        if (med.start_date && new Date(med.start_date) > now) return;
        if (med.end_date && new Date(med.end_date) < now) return;

        // med.schedule_time is usually "HH:MM"
        // In Postgres time type, it might include seconds "HH:MM:SS"
        const scheduleTime = med.schedule_time.substring(0, 5); 

        if (scheduleTime === currentTimeString) {
          const notificationKey = `${med.id}_${todayDateString}`;
          
          if (!notifiedMeds.current.has(notificationKey)) {
            // Trigger toast
            toast('Time for your medicine!', {
              description: `${med.name} (${med.dosage})`,
              icon: <Pill className="text-primary w-5 h-5" />,
              duration: 20000, // 20 seconds
              action: {
                label: 'Mark Taken',
                onClick: async () => {
                  await supabase.from('logs').insert([{ medicine_id: med.id, status: 'taken' }]);
                  toast.success(`Marked ${med.name} as taken.`);
                }
              },
            });
            
            // Mark as notified so we don't spam during this minute
            notifiedMeds.current.add(notificationKey);
          }
        }
      });
    };

    // Run check immediately, then every 30 seconds
    checkSchedule();
    const interval = setInterval(checkSchedule, 30000);
    
    return () => clearInterval(interval);
  }, [medicines]);

  return null; // This is a logic-only component that mounts globally
}
