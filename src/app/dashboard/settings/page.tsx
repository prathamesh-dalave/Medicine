'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Globe, Shield, CheckCircle, XCircle, Loader2, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { isPushSupported, getPermissionState, subscribeToPush, unsubscribeFromPush } from '@/lib/pushNotifications';

export default function SettingsPage() {
  const [pushStatus, setPushStatus] = useState<'loading' | 'unsupported' | 'granted' | 'denied' | 'default'>('loading');
  const [isToggling, setIsToggling] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneLoaded, setPhoneLoaded] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus('unsupported');
    } else {
      setPushStatus(getPermissionState());
    }

    // Load existing phone number from profile
    const loadPhone = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('phone_number').eq('id', user.id).single();
      if (data?.phone_number) setPhoneNumber(data.phone_number);
      setPhoneLoaded(true);
    };
    loadPhone();
  }, []);

  const handleSavePhone = async () => {
    setPhoneSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Phone number saved! You will now receive SMS reminders.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save phone number.');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsToggling(true);
    const result = await subscribeToPush();
    if (result.success) {
      setPushStatus('granted');
      if (result.pushFailed) {
        toast.success('Browser notifications enabled! Full push notifications will activate once deployed to HTTPS.');
      } else {
        toast.success('Push notifications enabled! You will receive medicine reminders even when the tab is closed.');
      }
    } else {
      toast.error(result.error || 'Failed to enable notifications.');
      setPushStatus(getPermissionState());
    }
    setIsToggling(false);
  };

  const handleDisableNotifications = async () => {
    setIsToggling(true);
    const result = await unsubscribeFromPush();
    if (result.success) {
      setPushStatus('default');
      toast.success('Push notifications disabled.');
    } else {
      toast.error(result.error || 'Failed to disable notifications.');
    }
    setIsToggling(false);
  };

  const renderPushButton = () => {
    if (pushStatus === 'loading') {
      return <Button variant="outline" size="sm" disabled><Loader2 className="w-4 h-4 animate-spin mr-1" /> Checking...</Button>;
    }
    if (pushStatus === 'unsupported') {
      return <Button variant="outline" size="sm" disabled className="text-slate-400">Not Supported</Button>;
    }
    if (pushStatus === 'denied') {
      return (
        <Button variant="outline" size="sm" disabled className="text-red-500 border-red-200">
          <XCircle className="w-4 h-4 mr-1" /> Blocked by Browser
        </Button>
      );
    }
    if (pushStatus === 'granted') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisableNotifications}
          disabled={isToggling}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          {isToggling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
          Enabled
        </Button>
      );
    }
    // default — not yet asked
    return (
      <Button
        variant="default"
        size="sm"
        onClick={handleEnableNotifications}
        disabled={isToggling}
        className="bg-primary hover:bg-primary/90"
      >
        {isToggling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
        Enable
      </Button>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your app preferences</p>
      </div>

      <div className="grid gap-6">
        {/* Push Notifications */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-slate-500" /> Push Notifications
            </CardTitle>
            <CardDescription>Configure browser push reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Push Notifications</p>
                <p className="text-sm text-slate-500">Receive alerts on your device even when the tab is closed</p>
              </div>
              {renderPushButton()}
            </div>
            {pushStatus === 'denied' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>Notifications are blocked.</strong> To re-enable, click the lock icon 🔒 in your browser&apos;s address bar, find &quot;Notifications&quot;, and change it to &quot;Allow&quot;. Then refresh this page.
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-slate-900">In-App Alerts</p>
                <p className="text-sm text-slate-500">Toast popups while using the dashboard</p>
              </div>
              <Button variant="outline" size="sm" className="text-green-600 border-green-200" disabled>
                <CheckCircle className="w-4 h-4 mr-1" /> Always On
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SMS Alerts */}
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="w-5 h-5 text-emerald-500" /> SMS Alerts
            </CardTitle>
            <CardDescription>Receive medicine reminders directly on your phone via text message. Works even without internet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="phone">Mobile Number (with country code)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!phoneLoaded}
                />
              </div>
              <Button
                onClick={handleSavePhone}
                disabled={phoneSaving || !phoneNumber}
                className="sm:self-end bg-emerald-600 hover:bg-emerald-700 shrink-0"
              >
                {phoneSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                {phoneSaving ? 'Saving...' : 'Save Number'}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              💡 Your number is used only for medicine reminders and caregiver alerts. We never share it.
            </p>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-slate-500" /> Regional Language
            </CardTitle>
            <CardDescription>Choose your preferred language for the interface.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button variant="default" className="bg-primary text-primary-foreground">English</Button>
              <Button variant="outline">हिन्दी (Hindi)</Button>
              <Button variant="outline">मराठी (Marathi)</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-slate-500" /> Security & Account
            </CardTitle>
            <CardDescription>Manage your account security and data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start text-slate-700">Change Password</Button>
            <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
