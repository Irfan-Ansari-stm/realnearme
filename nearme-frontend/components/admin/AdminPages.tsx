'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { postsApi, reportsApi, auditApi, algorithmApi, sessionsApi } from '@/lib/api';
import { PageHeader, Table, Badge, Button, Modal, Pagination, EmptyState, Card, StatCard } from '@/components/ui';
import { FileText, Flag, Clock, Zap, Cpu, Check, X, Play, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';

// ── Moderation Page ────────────────────────────────────────────────────────────
export function ModerationPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(['mod-queue', page], () => postsApi.getModerationQueue({ page, limit: 20 }), { keepPreviousData: true });

  const moderateMut = useMutation(
    ({ postId, action, reason }: { postId: string; action: 'approve' | 'reject'; reason?: string }) =>
      postsApi.moderate(postId, { action, reason }),
    { onSuccess: (_, { action }) => { qc.invalidateQueries('mod-queue'); toast.success(`Post ${action}d`); }, onError: (_err: unknown) => { toast.error('Action failed'); } }
  );

  const posts = data?.data?.data?.posts ?? [];
  const total = data?.data?.data?.total ?? 0;

  return (
    <div>
      <PageHeader title="Moderation Queue" subtitle={`${total} items need review`} />
      {posts.length === 0 && !isLoading
        ? <EmptyState icon={FileText} title="Queue is empty" description="All posts have been reviewed" />
        : (
          <>
            <div className="space-y-3">
              {posts.map((p: Record<string, unknown>) => (
                <div key={String(p.id)} className="card p-5 flex items-start gap-4">
                  <div className="w-20 h-20 bg-surface-200 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {p.storage_ref ? <img src={`https://storage.googleapis.com/${p.storage_ref}`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} /> : <FileText className="w-6 h-6 text-surface-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="orange">{String(p.status).replace('_', ' ')}</Badge>
                      <Badge variant="gray">{String(p.category)}</Badge>
                      {Number(p.report_count) >= 3 && <Badge variant="red">⚠ {String(p.report_count)} reports</Badge>}
                    </div>
                    <p className="text-sm text-surface-700 line-clamp-2 mb-1">{String(p.caption || 'No caption')}</p>
                    <p className="text-xs text-surface-500">by @{String(p.author_handle)} · {formatDistanceToNow(new Date(String(p.created_at)), { addSuffix: true })}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => moderateMut.mutate({ postId: String(p.id), action: 'approve' })} className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl text-xs font-display font-500 transition-colors border border-green-500/20">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => moderateMut.mutate({ postId: String(p.id), action: 'reject' })} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-display font-500 transition-colors border border-red-500/20">
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPage={setPage} />
          </>
        )
      }
    </div>
  );
}

// ── Reports Page ───────────────────────────────────────────────────────────────
export function ReportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(['admin-reports', page, statusFilter], () => reportsApi.adminList({ page, limit: 20, status: statusFilter }), { keepPreviousData: true });

  const resolveMut = useMutation(
    ({ reportId, action }: { reportId: string; action: 'reviewed_approved' | 'reviewed_removed' }) =>
      reportsApi.resolve(reportId, { action }),
    { onSuccess: () => { qc.invalidateQueries('admin-reports'); toast.success('Report resolved'); }, onError: (_err: unknown) => { toast.error('Failed'); } }
  );

  const reports = data?.data?.data?.reports ?? [];
  const total = data?.data?.data?.total ?? 0;

  return (
    <div>
      <PageHeader title="Reports" subtitle={`${total} reports`} />
      <div className="flex gap-2 mb-6">
        {['pending', 'reviewed_approved', 'reviewed_removed'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-sm font-display font-500 transition-all border ${statusFilter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <Table headers={['Reporter', 'Reason', 'Post', 'Status', 'Created', 'Actions']} loading={isLoading}>
        {reports.map((r: Record<string, unknown>) => (
          <tr key={String(r.id)}>
            <td className="px-4 py-3 text-sm text-surface-700">@{String(r.reporter_handle)}</td>
            <td className="px-4 py-3"><Badge variant="red">{String(r.reason)}</Badge></td>
            <td className="px-4 py-3 text-xs text-surface-500 max-w-32 truncate">{String(r.caption || r.post_id)}</td>
            <td className="px-4 py-3"><Badge variant={r.status === 'pending' ? 'orange' : r.status === 'reviewed_approved' ? 'green' : 'red'}>{String(r.status).replace('_', ' ')}</Badge></td>
            <td className="px-4 py-3 text-xs text-surface-500">{formatDistanceToNow(new Date(String(r.created_at)), { addSuffix: true })}</td>
            <td className="px-4 py-3">
              {r.status === 'pending' && (
                <div className="flex gap-1">
                  <button onClick={() => resolveMut.mutate({ reportId: String(r.id), action: 'reviewed_approved' })} className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-colors">Keep</button>
                  <button onClick={() => resolveMut.mutate({ reportId: String(r.id), action: 'reviewed_removed' })} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors">Remove</button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPage={setPage} />
    </div>
  );
}

// ── Audit Log Page ─────────────────────────────────────────────────────────────
export function AuditPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const { data, isLoading } = useQuery(['audit', page, actionFilter], () => auditApi.list({ page, limit: 30, ...(actionFilter && { action: actionFilter }) }), { keepPreviousData: true });
  const { data: summaryData } = useQuery('audit-summary', auditApi.getSummary);

  const logs = data?.data?.data?.logs ?? [];
  const total = data?.data?.data?.total ?? 0;
  const summary = summaryData?.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Immutable record of all admin actions" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summary.slice(0, 4).map((s: Record<string, unknown>) => (
          <div key={String(s.action)} className="card p-4 text-center">
            <p className="font-display font-700 text-xl text-surface-900">{String(s.count)}</p>
            <p className="text-xs text-surface-500 mt-1">{String(s.action).replace('_', ' ')}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'approve_post', 'reject_post', 'ban_user', 'unban_user', 'delete_post', 'resolve_report'].map((a) => (
          <button key={a} onClick={() => setActionFilter(a)} className={`px-3 py-1.5 rounded-xl text-xs font-display font-500 transition-all border ${actionFilter === a ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200'}`}>
            {a || 'All'}
          </button>
        ))}
      </div>
      <Table headers={['Action', 'Admin', 'Target', 'Reason', 'Time']} loading={isLoading}>
        {logs.map((l: Record<string, unknown>) => (
          <tr key={String(l.id)}>
            <td className="px-4 py-3"><Badge variant="orange">{String(l.action).replace('_', ' ')}</Badge></td>
            <td className="px-4 py-3 text-sm text-surface-700">{l.admin_handle ? `@${l.admin_handle}` : 'System'}</td>
            <td className="px-4 py-3"><Badge variant="gray">{String(l.target_type)}</Badge></td>
            <td className="px-4 py-3 text-xs text-surface-500 max-w-32 truncate">{String(l.reason || '—')}</td>
            <td className="px-4 py-3 text-xs text-surface-500">{formatDistanceToNow(new Date(String(l.created_at)), { addSuffix: true })}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={Math.ceil(total / 30)} onPage={setPage} />
    </div>
  );
}

// ── Algorithm Page ─────────────────────────────────────────────────────────────
export function AlgorithmPage() {
  const qc = useQueryClient();
  const { data: versionsData } = useQuery('algorithm-versions', algorithmApi.list);
  const { data: activeData } = useQuery('algorithm-active', algorithmApi.getActive);
  const [showDeploy, setShowDeploy] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { version: '', proximity: 0.25, rating: 0.20, vibe: 0.25, category: 0.15, recency: 0.10, popularity: 0.05 }
  });

  const deployMut = useMutation(
    (data: Record<string, unknown>) => {
      const { version, ...weights } = data;
      return algorithmApi.deploy({ version, weights });
    },
    { onSuccess: () => { qc.invalidateQueries('algorithm-versions'); qc.invalidateQueries('algorithm-active'); toast.success('Version deployed'); setShowDeploy(false); }, onError: (_err: unknown) => { toast.error('Weights must sum to 1.0'); } }
  );

  const activateMut = useMutation(
    { mutationFn: (version: string) => algorithmApi.activate(version), onSuccess: () => { qc.invalidateQueries('algorithm-active'); qc.invalidateQueries('algorithm-versions'); toast.success('Version activated'); }, onError: (_err: unknown) => { toast.error('Failed'); } }
  );

  const versions = versionsData?.data?.data ?? [];
  const active = activeData?.data?.data;
  const WEIGHT_KEYS = ['proximity', 'rating', 'vibe', 'category', 'recency', 'popularity'];

  return (
    <div>
      <PageHeader title="Algorithm Config" subtitle="Feed ranking weights management"
        action={<Button onClick={() => setShowDeploy(true)} size="sm" icon={<Plus className="w-4 h-4" />}>Deploy Version</Button>} />

      {active && (
        <Card className="mb-6 border-brand-500/20 bg-brand-500/5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-brand-400" />
            <h3 className="font-display font-700 text-surface-900">Active: v{active.version}</h3>
            <Badge variant="green">Live</Badge>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {active.weights && Object.entries(active.weights as Record<string, number>).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="h-16 bg-surface-200 rounded-xl overflow-hidden flex flex-col justify-end mb-2">
                  <div className="bg-brand-500 rounded-b-xl transition-all" style={{ height: `${v * 100}%` }} />
                </div>
                <p className="text-xs text-surface-500">{k}</p>
                <p className="text-xs font-mono text-brand-400 font-600">{(v * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {versions.map((v: Record<string, unknown>) => (
          <div key={String(v.version)} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono font-600 text-surface-900">v{String(v.version)}</span>
              {!!v.is_active && <Badge variant="green">Active</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-500">by {String(v.deployed_by || 'system')}</span>
              {!v.is_active && (
                <Button variant="ghost" size="sm" onClick={() => activateMut.mutate(String(v.version))}>Activate</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showDeploy} onClose={() => setShowDeploy(false)} title="Deploy Algorithm Version">
        <form onSubmit={handleSubmit((data) => deployMut.mutate(data as Record<string, unknown>))} className="space-y-4">
          <div>
            <label className="label">Version</label>
            <input className="input" placeholder="e.g. 1.2" {...register('version', { required: true, pattern: /^\d+\.\d+$/ })} />
          </div>
          <p className="text-xs text-surface-500">Weights must sum to exactly 1.0</p>
          <div className="grid grid-cols-2 gap-3">
            {WEIGHT_KEYS.map((k) => (
              <div key={k}>
                <label className="label">{k}</label>
                <input type="number" step="0.01" min="0" max="1" className="input" {...register(k as never, { required: true, valueAsNumber: true })} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowDeploy(false)} className="flex-1" type="button">Cancel</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">Deploy</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Sessions Admin Page ────────────────────────────────────────────────────────
export function SessionsAdminPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(['admin-sessions', page], () => sessionsApi.adminList({ page, limit: 20 }), { keepPreviousData: true });

  const revokeMut = useMutation(
    { mutationFn: (userId: string) => sessionsApi.adminRevokeUser(userId), onSuccess: () => { qc.invalidateQueries('admin-sessions'); toast.success('Sessions revoked'); }, onError: (_err: unknown) => { toast.error('Failed'); } }
  );

  const sessions = data?.data?.data?.sessions ?? [];
  const total = data?.data?.data?.total ?? 0;

  return (
    <div>
      <PageHeader title="Active Sessions" subtitle={`${total} active sessions`} />
      <Table headers={['User', 'Device', 'Last Active', 'Expires', 'Actions']} loading={isLoading}>
        {sessions.map((s: Record<string, unknown>) => (
          <tr key={String(s.id)}>
            <td className="px-4 py-3">
              <p className="text-sm font-500 text-surface-900">{String(s.display_name)}</p>
              <p className="text-xs text-surface-500">@{String(s.handle)}</p>
            </td>
            <td className="px-4 py-3 text-xs text-surface-600">{(s.device_info as Record<string, string>)?.platform || 'Unknown'}</td>
            <td className="px-4 py-3 text-xs text-surface-500">{formatDistanceToNow(new Date(String(s.last_used_at)), { addSuffix: true })}</td>
            <td className="px-4 py-3 text-xs text-surface-500">{formatDistanceToNow(new Date(String(s.expires_at)), { addSuffix: true })}</td>
            <td className="px-4 py-3">
              <button onClick={() => revokeMut.mutate(String(s.user_id))} className="text-xs text-red-400 hover:text-red-300 font-display font-500 transition-colors">Revoke</button>
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPage={setPage} />
    </div>
  );
}
