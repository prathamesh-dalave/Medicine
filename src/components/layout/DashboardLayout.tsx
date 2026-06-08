'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Pill, LayoutDashboard, PlusCircle, Users, BarChart2, Settings, LogOut, Menu, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const [isCaregiver, setIsCaregiver] = useState(false);

  useEffect(() => {
    const checkCaregiverStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('dependents')
        .select('id')
        .eq('caregiver_id', user.id)
        .limit(1);

      if (data && data.length > 0) {
        setIsCaregiver(true);
      }
    };
    checkCaregiverStatus();
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/medicines', label: 'Medicines', icon: Pill },
    { href: '/dashboard/family', label: 'Family Members', icon: Users },
    ...(isCaregiver ? [{ href: '/dashboard/monitoring', label: 'Monitoring', icon: Activity }] : []),
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-900">MedRemind</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <div className="md:hidden flex items-center p-4 border-b border-slate-200 bg-white">
          <SheetTrigger render={<Button variant="ghost" size="icon" className="mr-3" />}>
            <Menu className="w-6 h-6" />
          </SheetTrigger>
          <div className="flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">MedRemind</span>
          </div>
        </div>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
