'use client';

import { useState, useEffect, use } from 'react';
import { Pill, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MagicLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const medicineId = resolvedParams.id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [medicine, setMedicine] = useState<any>(null);
  const [status, setStatus] = useState<'pending' | 'success' | 'error' | 'already_taken'>('pending');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchMedicine = async () => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('*, dependents(name)')
          .eq('id', medicineId)
          .single();

        if (error) throw error;
        setMedicine(data);

        // Check if already taken today
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        
        const { data: logs } = await supabase
          .from('logs')
          .select('status')
          .eq('medicine_id', medicineId)
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay)
          .single();

        if (logs?.status === 'taken') {
          setStatus('already_taken');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg('Medicine not found or link is invalid.');
      } finally {
        setLoading(false);
      }
    };

    if (medicineId) fetchMedicine();
  }, [medicineId]);

  const handleMarkTaken = async () => {
    try {
      setSubmitting(true);
      const { error } = await supabase.from('logs').insert([{
        medicine_id: medicineId,
        status: 'taken',
      }]);
      
      if (error) throw error;
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Failed to log medicine. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h1>
        <p className="text-slate-600">{errorMsg}</p>
      </div>
    );
  }

  if (status === 'already_taken') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50 p-4 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Logged!</h1>
        <p className="text-slate-600">You have already marked this medicine as taken today.</p>
        <p className="text-sm text-slate-500 mt-4">You can safely close this window.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50 p-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Great Job!</h1>
        <p className="text-slate-600 text-lg">Your {medicine?.name} has been marked as taken.</p>
        <p className="text-sm text-slate-500 mt-8">You can safely close this window.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Pill className="w-10 h-10 text-primary" />
        </div>
        
        <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-2">
          Time for your medicine
        </h2>
        
        <h1 className="text-3xl font-extrabold text-slate-900 mb-1">
          {medicine?.name}
        </h1>
        
        <p className="text-xl text-slate-600 font-medium mb-8">
          {medicine?.dosage}
        </p>

        {medicine?.dependents?.name && (
          <div className="bg-slate-50 rounded-lg py-2 px-4 inline-block mb-8 border border-slate-100">
            <span className="text-sm text-slate-500">Prescription for:</span>
            <span className="ml-2 font-bold text-slate-900">{medicine.dependents.name}</span>
          </div>
        )}

        <button
          onClick={handleMarkTaken}
          disabled={submitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-8 h-8 mr-3" />
              I Took It!
            </>
          )}
        </button>
      </div>
    </div>
  );
}
