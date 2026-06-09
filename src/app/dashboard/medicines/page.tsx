'use client';

import { useEffect, useState } from 'react';
import { Pill, Plus, Clock, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todayLogs, setTodayLogs] = useState<Record<string, string>>({});
  const [markingTaken, setMarkingTaken] = useState<string | null>(null);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  
  const [dependents, setDependents] = useState<any[]>([]);

  const initialFormState = {
    name: '',
    dosage: '',
    frequency: 1,
    schedule_times: [''],
    start_date: '',
    end_date: '',
    dependent_id: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchMedicinesAndDependents = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch dependents
      const { data: deps } = await supabase
        .from('dependents')
        .select('*')
        .eq('caregiver_id', user.id);
      
      if (deps) setDependents(deps);

      // Fetch all medicines managed by this user (either for themselves or dependents)
      // Since we shifted to dependent model, the caregiver owns the medicines but assigns them to dependents.
      const { data } = await supabase
        .from('medicines')
        .select('*, dependents(name)')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        const todayStr = new Date().toISOString().split('T')[0];
        const activeMedicines = data.filter(med => !med.end_date || med.end_date >= todayStr);
        
        setMedicines(activeMedicines);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        
        const { data: logs } = await supabase
          .from('logs')
          .select('medicine_id, status')
          .in('medicine_id', data.map(m => m.id))
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay);

        if (logs) {
          const logMap: Record<string, string> = {};
          logs.forEach(l => { logMap[l.medicine_id] = l.status; });
          setTodayLogs(logMap);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicinesAndDependents();
  }, []);

  const markTaken = async (medicineId: string, medicineName: string) => {
    try {
      setMarkingTaken(medicineId);
      const { error } = await supabase.from('logs').insert([{
        medicine_id: medicineId,
        status: 'taken',
      }]);
      if (error) throw error;
      setTodayLogs(prev => ({ ...prev, [medicineId]: 'taken' }));
      toast.success(`${medicineName} marked as taken! ✅`);
    } catch (err: any) {
      toast.error('Failed to log dose: ' + err.message);
    } finally {
      setMarkingTaken(null);
    }
  };

  const deleteMedicine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    try {
      const { error } = await supabase.from('medicines').delete().eq('id', id);
      if (error) throw error;
      toast.success('Medicine deleted successfully');
      fetchMedicinesAndDependents();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to delete medicine: ' + error.message);
    }
  };

  const openEditModal = (med: any) => {
    setEditingMedId(med.id);
    setFormData({
      name: med.name,
      dosage: med.dosage || '',
      frequency: 1,
      schedule_times: [med.schedule_time],
      start_date: med.start_date || '',
      end_date: med.end_date || '',
      dependent_id: med.dependent_id || ''
    });
    setIsSheetOpen(true);
  };

  const handleAddNew = () => {
    setEditingMedId(null);
    setFormData(initialFormState);
    setIsSheetOpen(true);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFreq = parseInt(e.target.value);
    const newTimes = [...formData.schedule_times];
    
    if (newFreq > newTimes.length) {
      while (newTimes.length < newFreq) newTimes.push('');
    } else {
      newTimes.length = newFreq;
    }

    setFormData({ ...formData, frequency: newFreq, schedule_times: newTimes });
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...formData.schedule_times];
    newTimes[index] = value;
    setFormData({ ...formData, schedule_times: newTimes });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.schedule_times.some(t => !t)) {
        toast.error('Please fill in all scheduled times.');
        return;
      }

      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingMedId) {
        const payload = {
          name: formData.name,
          dosage: formData.dosage || null,
          schedule_time: formData.schedule_times[0],
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          dependent_id: formData.dependent_id || null
        };
        const { error } = await supabase.from('medicines').update(payload).eq('id', editingMedId);
        if (error) throw error;
        toast.success('Medicine updated successfully!');
      } else {
        const payloads = formData.schedule_times.map(time => ({
          name: formData.name,
          dosage: formData.dosage || null,
          schedule_time: time,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          patient_id: user.id,
          dependent_id: formData.dependent_id || null
        }));

        const { error } = await supabase.from('medicines').insert(payloads);
        if (error) throw error;
        toast.success(formData.frequency > 1 ? `${formData.frequency} doses added successfully!` : 'Medicine added successfully!');
      }
      
      setIsSheetOpen(false);
      setEditingMedId(null);
      setFormData(initialFormState);
      
      fetchMedicinesAndDependents();
    } catch (error: any) {
      console.error('Supabase Error Detailed:', JSON.stringify(error, null, 2));
      toast.error('DB Error: ' + JSON.stringify(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Medicines</h1>
          <p className="text-slate-500 mt-1">Manage all your prescriptions and schedules</p>
        </div>
        
        <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <DialogTrigger render={<Button onClick={handleAddNew} className="shrink-0 bg-primary hover:bg-primary/90 text-white" />}>
            <Plus className="w-4 h-4 mr-2" /> Add Medicine
          </DialogTrigger>
          <DialogContent className="overflow-y-auto max-h-[90vh] w-full sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMedId ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="dependent">For Family Member (Optional)</Label>
                <select 
                  id="dependent"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  value={formData.dependent_id}
                  onChange={(e) => setFormData({...formData, dependent_id: e.target.value})}
                >
                  <option value="">Myself</option>
                  {dependents.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Medicine Name</Label>
                <Input 
                  id="name" 
                  required 
                  placeholder="e.g. Paracetamol"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage</Label>
                <Input 
                  id="dosage" 
                  required
                  placeholder="e.g. 500mg or 1 Tablet"
                  value={formData.dosage}
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                />
              </div>

              {!editingMedId && (
                <div className="space-y-2">
                  <Label htmlFor="frequency">Daily Frequency</Label>
                  <select 
                    id="frequency"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.frequency}
                    onChange={handleFrequencyChange}
                  >
                    <option value={1}>Once a day</option>
                    <option value={2}>Twice a day</option>
                    <option value={3}>3 times a day</option>
                    <option value={4}>4 times a day</option>
                  </select>
                </div>
              )}

              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <Label>{editingMedId ? 'Scheduled Time' : 'Scheduled Times'}</Label>
                {formData.schedule_times.map((time, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {!editingMedId && <span className="text-sm font-medium text-slate-500 w-16">Dose {index + 1}:</span>}
                    <Input 
                      type="time" 
                      required 
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input 
                    id="start_date" 
                    type="date" 
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input 
                    id="end_date" 
                    type="date" 
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Adding...' : 'Save Schedule'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-500">Loading medicines...</p>
        ) : medicines.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {medicines.map((med) => (
              <Card key={med.id} className="border-slate-100 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                        <Pill className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">{med.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-600 font-medium">{med.dosage}</p>
                          {med.dependents?.name && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                              For: {med.dependents.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Clock className="w-4 h-4 mr-2 text-slate-400" />
                      Scheduled for: <span className="font-semibold text-slate-900 ml-1">{med.schedule_time}</span>
                    </div>
                    {(med.start_date || med.end_date) && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        Duration: <span className="font-semibold text-slate-900 ml-1">{med.start_date} to {med.end_date}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-3">
                    {todayLogs[med.id] === 'taken' ? (
                      <Button variant="outline" className="flex-1 text-emerald-600 border-emerald-200 bg-emerald-50" disabled>
                        <CheckCircle className="w-4 h-4 mr-2" /> Taken Today
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => markTaken(med.id, med.name)}
                        disabled={markingTaken === med.id}
                      >
                        {markingTaken === med.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Mark Taken
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      onClick={() => openEditModal(med)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => deleteMedicine(med.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-slate-200 bg-transparent">
            <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
              <Pill className="w-12 h-12 mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Medicines Found</h3>
              <p className="mb-6">You haven't added any medicines yet.</p>
              
              <Button onClick={() => setIsSheetOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Your First Medicine
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
