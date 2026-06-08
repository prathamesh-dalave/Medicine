'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Check, X, Clock, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [takenCount, setTakenCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch logs for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data } = await supabase
          .from('logs')
          .select('*, medicines!inner(name, patient_id)')
          .eq('medicines.patient_id', user.id)
          .gte('timestamp', sevenDaysAgo.toISOString())
          .order('timestamp', { ascending: false });

        if (data) {
          setLogs(data);
          
          let taken = 0;
          let missed = 0;
          
          // Group by date for Bar Chart
          const dailyStats: Record<string, number> = {};
          
          // Initialize last 7 days
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyStats[dateStr] = 0;
          }

          data.forEach(log => {
            if (log.status === 'taken') taken++;
            if (log.status === 'missed') missed++;
            
            if (log.status === 'missed') {
              const d = new Date(log.timestamp);
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              if (dailyStats[dateStr] !== undefined) {
                dailyStats[dateStr]++;
              }
            }
          });

          setTakenCount(taken);
          setMissedCount(missed);
          // Assuming pending means scheduled for today but not yet logged (simplified logic for now)
          setPendingCount(0); 

          const formattedChartData = Object.keys(dailyStats).map(date => ({
            name: date,
            missed: dailyStats[date]
          }));
          
          setChartData(formattedChartData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const pieData = [
    { name: 'Taken', value: takenCount },
    { name: 'Missed', value: missedCount },
  ];
  const PIE_COLORS = ['#10b981', '#ef4444']; // Emerald and Red

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header section matching image */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1e293b]">Reports</h1>
          <p className="text-slate-500 mt-1">Medication adherence history</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 outline-none">
            <option>All Members</option>
          </select>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button className="px-3 py-1 text-sm font-medium bg-white shadow-sm rounded-md text-slate-900">7 Days</button>
            <button className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-slate-900">14 Days</button>
            <button className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-slate-900">30 Days</button>
          </div>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Check className="w-8 h-8 text-emerald-500 mb-2" />
            <h2 className="text-3xl font-bold text-slate-900">{takenCount}</h2>
            <p className="text-slate-500 font-medium">Taken</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <X className="w-8 h-8 text-red-500 mb-2" />
            <h2 className="text-3xl font-bold text-slate-900">{missedCount}</h2>
            <p className="text-slate-500 font-medium">Missed</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-amber-500 mb-2" />
            <h2 className="text-3xl font-bold text-slate-900">{pendingCount}</h2>
            <p className="text-slate-500 font-medium">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart - Daily Activity */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-800">Daily Activity (Missed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={true} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={true} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    allowDecimals={false}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="missed" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart - Adherence Split */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-800">Adherence Split</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-slate-600">Taken</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-slate-600">Missed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Log Table */}
      <Card className="border-slate-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" /> Detailed Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 text-center py-4">Loading history...</p>
          ) : logs.length > 0 ? (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {logs.slice(0, 10).map((log) => {
                const isTaken = log.status === 'taken';
                return (
                  <div key={log.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isTaken ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {isTaken ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-md font-bold text-slate-900">{log.medicines?.name || 'Unknown Medicine'}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                          <CalendarIcon className="w-3.5 h-3.5" /> <span>{formatDate(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold px-3 py-1 rounded-full ${isTaken ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {isTaken ? 'Taken' : 'Missed'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No activity logs found yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
