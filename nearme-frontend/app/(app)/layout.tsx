'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { notificationsApi } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setUnreadCount } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    // Poll unread notifications
    const fetchUnread = async () => {
      try {
        const res = await notificationsApi.getAll({ unread_only: true, limit: 1 });
        setUnreadCount(res.data.data?.unread_count ?? 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, router, setUnreadCount]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto lg:pl-8">
          {children}
        </div>
      </main>
    </div>
  );
}
