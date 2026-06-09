'use client';

import { useEffect, useState } from 'react';
import { Pill, Check, X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';

export default function Dashboard() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, taken: 0, missed: 0 });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const userId = userData.user.id;

      // Fetch all medicines (own + dependents)
      const { data: meds } = await supabase
        .from('medicines')
        .select('*, dependents(name)')
        .eq('patient_id', userId);
      
      let activeMeds: any[] = [];
      if (meds) {
        const todayStr = new Date().toISOString().split('T')[0];
        activeMeds = meds.filter(med => !med.end_date || med.end_date >= todayStr);
        setMedicines(activeMeds);
      }

      // Fetch logs for stats (today)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { data: logs } = await supabase
        .from('logs')
        .select('*, medicines!inner(*)')
        .eq('medicines.patient_id', userId)
        .gte('timestamp', startOfDay.toISOString());

      let taken = 0;
      let missed = 0;
      logs?.forEach(log => {
        if (log.status === 'taken') taken++;
        if (log.status === 'missed') missed++;
      });

      setStats({
        total: activeMeds.length,
        taken,
        missed
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDayName = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Today&apos;s Dashboard</h1>
        <p className="text-slate-500 mt-1">{getDayName()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Medicines</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Taken Today</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.taken}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <X className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Missed Today</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.missed}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Your Schedule
        </h2>
        
        {loading ? (
          <p className="text-slate-500">Loading your schedule...</p>
        ) : medicines.length > 0 ? (
          <div className="grid gap-4">
            {medicines.map((med) => (
              <Card key={med.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{med.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <span>{med.dosage}</span>
                        <span>&middot;</span>
                        <Clock className="w-3.5 h-3.5" /> <span>{med.schedule_time}</span>
                        {med.dependents?.name && (
                          <>
                            <span>&middot;</span>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                              For: {med.dependents.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="p-8 text-center text-slate-500">
              No medicines scheduled today. Add one to get started!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
