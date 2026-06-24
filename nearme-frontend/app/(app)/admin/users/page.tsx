'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usersApi } from '@/lib/api';
import { PageHeader, Table, Badge, Button, Input, Modal, Pagination, Skeleton } from '@/components/ui';
import { Users, Search, Shield, Ban, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const roleBadge: Record<string, 'orange' | 'blue' | 'gray'> = { admin: 'orange', moderator: 'blue', user: 'gray' };

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [banModal, setBanModal] = useState<{ userId: string; handle: string; ban: boolean } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [roleModal, setRoleModal] = useState<{ userId: string; handle: string } | null>(null);
  const [newRole, setNewRole] = useState('user');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(
    ['admin-users', page, search, roleFilter, activeFilter],
    () => usersApi.adminList({ page, limit: 20, ...(search && { search }), ...(roleFilter && { role: roleFilter }), ...(activeFilter && { is_active: activeFilter }) }),
    { keepPreviousData: true }
  );

  const banMut = useMutation(
    ({ userId, ban, reason }: { userId: string; ban: boolean; reason?: string }) =>
      ban ? usersApi.banUser(userId, reason) : usersApi.unbanUser(userId),
    {
      onSuccess: (_, { ban }) => {
        qc.invalidateQueries('admin-users');
        toast.success(ban ? 'User banned' : 'User unbanned');
        setBanModal(null);
        setBanReason('');
      },
      onError: (_err: unknown) => { toast.error('Action failed'); },
    }
  );

  const roleMut = useMutation(
    { mutationFn: ({ userId, role }: { userId: string; role: string }) => usersApi.setRole(userId, role), onSuccess: () => { qc.invalidateQueries('admin-users'); toast.success('Role updated'); setRoleModal(null); }, onError: (_err: unknown) => { toast.error('Failed to update role'); } }
  );

  const users = data?.data?.data ?? [];
  const total = data?.data?.meta?.total ?? 0;

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${total} total users`} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, handle, email..." className="input pl-9 py-2.5 text-sm" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input w-auto py-2.5 text-sm">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
        <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }} className="input w-auto py-2.5 text-sm">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Banned</option>
        </select>
      </div>

      <Table headers={['User', 'Role', 'Status', 'Posts', 'Saves', 'Last Active', 'Actions']} loading={isLoading}>
        {users.map((u: Record<string, unknown>) => (
          <tr key={String(u.id)} className="hover:bg-surface-100/50 transition-colors">
            <td className="px-4 py-3">
              <div>
                <p className="font-display font-500 text-surface-900 text-sm">{String(u.display_name)}</p>
                <p className="text-xs text-surface-500">@{String(u.handle)}</p>
              </div>
            </td>
            <td className="px-4 py-3"><Badge variant={roleBadge[String(u.role)] ?? 'gray'}>{String(u.role)}</Badge></td>
            <td className="px-4 py-3"><Badge variant={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Active' : 'Banned'}</Badge></td>
            <td className="px-4 py-3 font-mono text-sm text-surface-700">{String(u.stat_posts ?? 0)}</td>
            <td className="px-4 py-3 font-mono text-sm text-surface-700">{String(u.stat_saves ?? 0)}</td>
            <td className="px-4 py-3 text-xs text-surface-500">{u.last_active_at ? formatDistanceToNow(new Date(String(u.last_active_at)), { addSuffix: true }) : '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => { setRoleModal({ userId: String(u.id), handle: String(u.handle) }); setNewRole(String(u.role)); }}
                  className="w-7 h-7 flex items-center justify-center text-surface-500 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors" title="Change role">
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setBanModal({ userId: String(u.id), handle: String(u.handle), ban: Boolean(u.is_active) })}
                  className={clsx('w-7 h-7 flex items-center justify-center rounded-lg transition-colors', u.is_active ? 'text-surface-500 hover:text-red-400 hover:bg-red-500/10' : 'text-green-400 hover:text-green-300 hover:bg-green-500/10')} title={u.is_active ? 'Ban user' : 'Unban user'}>
                  {u.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPage={setPage} />

      {/* Ban modal */}
      <Modal open={!!banModal} onClose={() => setBanModal(null)} title={banModal?.ban ? `Ban @${banModal?.handle}` : `Unban @${banModal?.handle}`} size="sm">
        {banModal?.ban && (
          <div className="mb-4">
            <Input label="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Community guidelines violation..." />
          </div>
        )}
        <p className="text-sm text-surface-600 mb-6">{banModal?.ban ? 'This will revoke all active sessions for this user.' : 'The user will be able to log in again.'}</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setBanModal(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => banMut.mutate({ userId: banModal!.userId, ban: banModal!.ban, reason: banReason })} loading={banMut.isLoading} className="flex-1">
            {banModal?.ban ? 'Ban User' : 'Unban User'}
          </Button>
        </div>
      </Modal>

      {/* Role modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title={`Change role — @${roleModal?.handle}`} size="sm">
        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="input mb-4">
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setRoleModal(null)} className="flex-1">Cancel</Button>
          <Button onClick={() => roleMut.mutate({ userId: roleModal!.userId, role: newRole })} loading={roleMut.isLoading} className="flex-1">Update Role</Button>
        </div>
      </Modal>
    </div>
  );
}
