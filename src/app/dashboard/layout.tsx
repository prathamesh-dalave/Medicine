import DashboardLayout from '@/components/layout/DashboardLayout';
import NotificationChecker from '@/components/NotificationChecker';
import { Toaster } from '@/components/ui/sonner';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
      <NotificationChecker />
      <Toaster position="top-right" richColors />
    </>
  );
}
