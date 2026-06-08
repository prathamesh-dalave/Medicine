'use client';

import { useState, useEffect } from 'react';
import { User, UserPlus, Phone, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function FamilyPage() {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dependents, setDependents] = useState<any[]>([]);

  const initialFormState = {
    name: '',
    relationship: 'Parent',
    phone: '',
    email: '',
    notify_missed: true
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchDependents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('dependents')
        .select('*')
        .eq('caregiver_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setDependents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDependents();
  }, []);

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('dependents').insert([{
        caregiver_id: user.id,
        name: formData.name,
        relationship: formData.relationship,
        phone: formData.phone,
        notify_missed: formData.notify_missed
      }]);

      if (error) throw error;
      
      toast.success('Family member added successfully!');
      setIsDialogOpen(false);
      setFormData(initialFormState);
      fetchDependents();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add family member');
    } finally {
      setLoading(false);
    }
  };

  const deleteDependent = async (id: string) => {
    if (!confirm('Are you sure? This will delete all medicines and logs for this family member.')) return;
    try {
      const { error } = await supabase.from('dependents').delete().eq('id', id);
      if (error) throw error;
      toast.success('Family member removed.');
      fetchDependents();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to delete.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Family Members</h1>
          <p className="text-slate-500 mt-1">Manage the people you care for</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <UserPlus className="w-4 h-4 mr-2" /> Add Family Member
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDependent} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input 
                  id="name" 
                  required 
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <select 
                  id="relationship"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  value={formData.relationship}
                  onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                >
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (For SMS Reminders)</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="notify" className="font-medium cursor-pointer">Notify on missed doses</Label>
                <input 
                  type="checkbox"
                  id="notify" 
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={formData.notify_missed}
                  onChange={(e) => setFormData({...formData, notify_missed: e.target.checked})}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#0ea5e9] hover:bg-[#0284c7]">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add Member
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {dependents.length > 0 ? (
          dependents.map((dep) => (
            <Card key={dep.id} className="border-slate-100 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-primary flex items-center justify-center shrink-0">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{dep.name}</h4>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{dep.relationship}</span>
                      {dep.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {dep.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200" onClick={() => deleteDependent(dep.id)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed border-2 border-slate-200 bg-transparent">
            <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
              <UserPlus className="w-12 h-12 mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Family Members Added</h3>
              <p className="mb-6">Add a family member to manage their medications and reminders.</p>
              <Button onClick={() => setIsDialogOpen(true)}>Add Your First Member</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
