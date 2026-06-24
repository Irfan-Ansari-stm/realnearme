'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { PageHeader, EmptyState, Pagination, Button, Badge, Skeleton } from '@/components/ui';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const typeIcon: Record<string, string> = { like: '❤️', comment: '💬', new_nearby: '📍', milestone: '🏆', system: '🔔' };

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { setUnreadCount, decrementUnread } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(
    ['notifications', page, unreadOnly],
    () => notificationsApi.getAll({ page, limit: 20, unread_only: unreadOnly }),
    {
      onSuccess: (res) => setUnreadCount(res.data.data?.unread_count ?? 0),
      keepPreviousData: true,
    }
  );

  const markAllMut = useMutation(notificationsApi.markAllRead, {
    onSuccess: () => { qc.invalidateQueries('notifications'); setUnreadCount(0); toast.success('All marked as read'); }
  });

  const markOneMut = useMutation(
    { mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: () => { qc.invalidateQueries('notifications'); decrementUnread(); } }
  );

  const deleteMut = useMutation(
    { mutationFn: (id: string) => notificationsApi.delete(id), onSuccess: () => { qc.invalidateQueries('notifications'); toast.success('Notification deleted'); } }
  );

  const clearAllMut = useMutation(notificationsApi.clearAll, {
    onSuccess: () => { qc.invalidateQueries('notifications'); setUnreadCount(0); toast.success('All notifications cleared'); }
  });

  const notifs = data?.data?.data?.notifications ?? [];
  const total = data?.data?.data?.total ?? 0;
  const unreadCount = data?.data?.data?.unread_count ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllMut.mutate()} loading={markAllMut.isLoading} icon={<CheckCheck className="w-4 h-4" />}>
                Mark all read
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => clearAllMut.mutate()} loading={clearAllMut.isLoading} icon={<Trash2 className="w-4 h-4" />}>
              Clear all
            </Button>
          </div>
        }
      />

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[false, true].map((v) => (
          <button key={String(v)} onClick={() => { setUnreadOnly(v); setPage(1); }}
            className={clsx('px-4 py-2 rounded-xl text-sm font-display font-500 transition-all border',
              unreadOnly === v ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
            {v ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : notifs.length === 0 ? (
        <EmptyState icon={Bell} title={unreadOnly ? 'No unread notifications' : 'No notifications'} description="You're all caught up!" />
      ) : (
        <>
          <div className="space-y-2">
            {notifs.map((n: Record<string, unknown>) => (
              <div key={String(n.id)}
                className={clsx('flex items-start gap-4 p-4 rounded-2xl transition-all group', n.is_read ? 'bg-surface-50 border border-surface-200' : 'bg-brand-500/5 border border-brand-500/20')}>
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', n.is_read ? 'bg-surface-200' : 'bg-brand-500/15')}>
                  {typeIcon[String(n.type)] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-display font-600', n.is_read ? 'text-surface-700' : 'text-surface-900')}>{String(n.title)}</p>
                  <p className="text-xs text-surface-600 mt-0.5">{String(n.body)}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-surface-500">{formatDistanceToNow(new Date(String(n.created_at)), { addSuffix: true })}</span>
                    <Badge variant="gray">{String(n.type)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.is_read && (
                    <button onClick={() => markOneMut.mutate(String(n.id))} className="w-8 h-8 flex items-center justify-center text-surface-500 hover:text-green-400 transition-colors rounded-lg hover:bg-surface-100">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteMut.mutate(String(n.id))} className="w-8 h-8 flex items-center justify-center text-surface-500 hover:text-red-400 transition-colors rounded-lg hover:bg-surface-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
