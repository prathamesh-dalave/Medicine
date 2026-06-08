'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, Check, X, Clock, ShieldCheck } from 'lucide-react';

export default function MonitoringPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dependents } = await supabase
        .from('dependents')
        .select('*')
        .eq('caregiver_id', user.id);

      if (!dependents || dependents.length === 0) {
        setLoading(false);
        return;
      }

      const dependentIds = dependents.map((d: any) => d.id);

      const { data: medicines } = await supabase
        .from('medicines')
        .select('*')
        .in('dependent_id', dependentIds);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const medIds = medicines?.map((m: any) => m.id) || [];
      let logs: any[] = [];
      if (medIds.length > 0) {
        const { data: logData } = await supabase
          .from('logs')
          .select('*')
          .in('medicine_id', medIds)
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay);
        logs = logData || [];
      }

      const patientData = dependents.map((dep: any) => {
        const depMeds = medicines?.filter((m: any) => m.dependent_id === dep.id) || [];
        
        const medsWithStatus = depMeds.map((med: any) => {
          const medLogs = logs.filter((l: any) => l.medicine_id === med.id);
          const latestLog = medLogs.length > 0 ? medLogs[medLogs.length - 1] : null;
          return {
            ...med,
            status: latestLog ? latestLog.status : 'pending',
            logTime: latestLog ? latestLog.timestamp : null
          };
        });

        medsWithStatus.sort((a: any, b: any) => (a.schedule_time || '').localeCompare(b.schedule_time || ''));

        return {
          id: dep.id,
          name: dep.name,
          relationship: dep.relationship,
          phone: dep.phone,
          medicines: medsWithStatus
        };
      });

      setPatients(patientData);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken': return <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check className="w-4 h-4" /></div>;
      case 'missed': return <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center"><X className="w-4 h-4" /></div>;
      default: return <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><Clock className="w-4 h-4" /></div>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Caregiver Monitoring</h1>
          <p className="text-slate-500 mt-1">Live adherence tracking for your family members</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading patient data...</p>
      ) : patients.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {patients.map((patient) => {
            const takenCount = patient.medicines.filter((m: any) => m.status === 'taken').length;
            const totalCount = patient.medicines.length;
            const progress = totalCount === 0 ? 0 : (takenCount / totalCount) * 100;

            return (
              <Card key={patient.id} className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{patient.name}</h3>
                    <p className="text-sm text-slate-500">{patient.relationship} {patient.phone ? `· ${patient.phone}` : ''}</p>
                  </div>
                </div>
                
                <CardContent className="p-0 flex-1">
                  {patient.medicines.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {patient.medicines.map((med: any) => (
                        <div key={med.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(med.status)}
                            <div>
                              <p className="font-semibold text-slate-900">{med.name}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                                  {med.schedule_time?.substring(0, 5)}
                                </span>
                                <span>•</span>
                                <span>{med.dosage}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-medium capitalize">
                            {med.status === 'taken' && <span className="text-emerald-600">Taken</span>}
                            {med.status === 'missed' && <span className="text-red-500">Missed</span>}
                            {med.status === 'pending' && <span className="text-amber-500">Pending</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      <Calendar className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                      <p>No medicines assigned yet.</p>
                    </div>
                  )}
                </CardContent>
                
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">Today&apos;s Adherence</span>
                    <span className="font-bold text-indigo-600">{takenCount} / {totalCount}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200 bg-transparent">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No family members added yet</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Go to the &quot;Family Members&quot; tab to add the people you care for, then assign medicines to them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
