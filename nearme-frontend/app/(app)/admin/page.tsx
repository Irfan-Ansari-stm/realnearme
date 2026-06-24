'use client';
import { useQuery } from 'react-query';
import { adminApi } from '@/lib/api';
import { PageHeader, StatCard, Card, Button, Skeleton, Badge } from '@/components/ui';
import { Users, FileText, MapPin, Bookmark, Flag, Cpu, Bell, Activity, Play, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const JOBS = [
  'cleanup_expired_cache','cleanup_expired_notifications','cleanup_expired_rate_limits',
  'gdpr_hard_delete','cleanup_post_tombstones','cleanup_old_reports','cleanup_feed_ranking_log'
];

export default function AdminDashboardPage() {
  const [days, setDays] = useState(7);
  const { data: dashData, isLoading: dashLoading, refetch } = useQuery('admin-dashboard', adminApi.getDashboard, { refetchInterval: 60_000 });
  const { data: userGrowthData } = useQuery(['user-growth', days], () => adminApi.getUserAnalytics(days));
  const { data: postTrendsData } = useQuery(['post-trends', days], () => adminApi.getPostAnalytics(days));
  const { data: placesData } = useQuery('top-places', () => adminApi.getPlaceAnalytics(10));
  const { data: searchData } = useQuery('search-trends', () => adminApi.getSearchAnalytics(10));
  const { data: rateLimitsData } = useQuery('rate-limits', adminApi.getRateLimits);
  const { data: jobsData } = useQuery('admin-jobs', adminApi.listJobs);

  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const handleTrigger = async (job: string) => {
    setTriggeringJob(job);
    try { await adminApi.triggerJob(job); toast.success(`Job "${job}" triggered`); }
    catch { toast.error('Failed to trigger job'); }
    finally { setTriggeringJob(null); }
  };

  const d = dashData?.data?.data;
  const userGrowth = userGrowthData?.data?.data ?? [];
  const postTrends = postTrendsData?.data?.data ?? [];
  const topPlaces = placesData?.data?.data ?? [];
  const searchTrends = searchData?.data?.data ?? [];
  const rateLimits = rateLimitsData?.data?.data ?? [];

  const customTooltipStyle = { backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', fontFamily: 'var(--font-body)', fontSize: 12 };

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System health and analytics overview"
        action={<Button variant="ghost" size="sm" onClick={() => refetch()} icon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>} />

      {/* Top stats */}
      {dashLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : d ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={d.users?.total_users ?? 0} icon={Users} color="orange" />
          <StatCard label="Active Users" value={d.users?.active_users ?? 0} icon={Users} color="green" />
          <StatCard label="New Today" value={d.users?.new_today ?? 0} icon={Users} color="blue" />
          <StatCard label="Pending Deletion" value={d.users?.pending_deletion ?? 0} icon={Users} color="red" />
          <StatCard label="Total Posts" value={d.posts?.total_posts ?? 0} icon={FileText} color="orange" />
          <StatCard label="Pending Moderation" value={d.posts?.pending_moderation ?? 0} icon={FileText} color="red" />
          <StatCard label="Pending Reports" value={d.reports?.pending_reports ?? 0} icon={Flag} color="red" />
          <StatCard label="Active Sessions" value={d.sessions?.active_sessions ?? 0} icon={Cpu} color="blue" />
        </div>
      ) : null}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-700 text-surface-900">User Growth</h3>
            <div className="flex gap-1">
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)} className={`px-2.5 py-1 rounded-lg text-xs font-display font-500 transition-all ${days === d ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600'}`}>{d}d</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={userGrowth.slice().reverse()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
              <XAxis dataKey="day" tick={{ fill: '#737373', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fill: '#737373', fontSize: 10 }} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Line type="monotone" dataKey="new_users" stroke="#f97316" strokeWidth={2} dot={false} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-display font-700 text-surface-900 mb-6">Post Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={postTrends.slice().reverse()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
              <XAxis dataKey="day" tick={{ fill: '#737373', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fill: '#737373', fontSize: 10 }} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="approved" fill="#22c55e" name="Approved" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#f97316" name="Pending" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top places */}
        <Card className="lg:col-span-1">
          <h3 className="font-display font-700 text-surface-900 mb-4">Top Places</h3>
          <div className="space-y-3">
            {topPlaces.slice(0, 6).map((p: Record<string, unknown>, i: number) => (
              <div key={String(p.place_id)} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-xs font-display font-700 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-500 text-surface-900 truncate">{String(p.name)}</p>
                  <p className="text-xs text-surface-500">{String(p.save_count)} saves · ⭐{String(p.rating ?? '—')}</p>
                </div>
                <Badge variant="orange">{String(p.category)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Search trends */}
        <Card className="lg:col-span-1">
          <h3 className="font-display font-700 text-surface-900 mb-4">Search Trends (7d)</h3>
          <div className="space-y-2">
            {searchTrends.slice(0, 8).map((t: Record<string, unknown>, i: number) => (
              <div key={String(t.query)} className="flex items-center gap-3">
                <span className="text-xs text-surface-500 w-4 flex-shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-surface-700 truncate">{String(t.query)}</span>
                <span className="text-xs font-mono text-brand-400 flex-shrink-0">{String(t.search_count)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Rate limits */}
        <Card className="lg:col-span-1">
          <h3 className="font-display font-700 text-surface-900 mb-4">Rate Limits</h3>
          <div className="space-y-3">
            {rateLimits.map((r: Record<string, unknown>) => (
              <div key={String(r.endpoint)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-surface-600 font-mono truncate">{String(r.endpoint).replace('/api/v1', '')}</span>
                  <span className="text-xs font-mono text-surface-900">{Number(r.total_requests).toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, (Number(r.total_requests) / 10000) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      {d?.recent_activity?.length > 0 && (
        <Card className="mb-8">
          <h3 className="font-display font-700 text-surface-900 mb-4">Recent Admin Activity</h3>
          <div className="space-y-2">
            {d.recent_activity.map((a: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-surface-200 last:border-0">
                <Badge variant="orange">{String(a.action).replace('_', ' ')}</Badge>
                <span className="text-surface-500">by</span>
                <span className="text-surface-700 font-500">@{String(a.admin_handle || 'system')}</span>
                <span className="text-surface-500 text-xs ml-auto">{formatDistanceToNow(new Date(String(a.created_at)), { addSuffix: true })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cron jobs */}
      <Card>
        <h3 className="font-display font-700 text-surface-900 mb-4">Maintenance Jobs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {JOBS.map((job) => (
            <div key={job} className="flex items-center justify-between p-3 bg-surface-100 rounded-xl">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-surface-500" />
                <span className="text-xs font-mono text-surface-700">{job.replace('cleanup_', '').replace(/_/g, ' ')}</span>
              </div>
              <button onClick={() => handleTrigger(job)} disabled={triggeringJob === job}
                className="w-7 h-7 flex items-center justify-center text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded-lg transition-colors">
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
