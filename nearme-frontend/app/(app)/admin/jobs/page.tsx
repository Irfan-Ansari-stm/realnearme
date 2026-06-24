'use client';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { adminApi } from '@/lib/api';
import { PageHeader, Card, Button } from '@/components/ui';
import { Activity, Play } from 'lucide-react';
import toast from 'react-hot-toast';

const JOB_DESCRIPTIONS: Record<string, string> = {
  cleanup_expired_cache: 'Deletes expired entries from places_cache and place_detail_cache.',
  cleanup_expired_notifications: 'Removes notifications older than 90 days (GDPR Art.5).',
  cleanup_expired_rate_limits: 'Purges expired rate limit counter windows.',
  gdpr_hard_delete: 'Hard-deletes users whose 30-day GDPR deletion deadline has passed.',
  cleanup_post_tombstones: 'Permanently removes soft-deleted posts older than 90 days.',
  cleanup_old_reports: 'Deletes resolved reports older than 1 year.',
  cleanup_feed_ranking_log: 'Removes feed ranking analytics older than 90 days.',
};

export default function AdminJobsPage() {
  const { data: jobsData } = useQuery('admin-jobs', adminApi.listJobs);
  const jobs: string[] = jobsData?.data?.data?.jobs ?? [];

  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const handleTrigger = async (job: string) => {
    setTriggeringJob(job);
    try {
      await adminApi.triggerJob(job);
      toast.success(`Job "${job}" completed successfully`);
    } catch {
      toast.error(`Failed to trigger "${job}"`);
    } finally {
      setTriggeringJob(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Maintenance Jobs"
        subtitle="Manually trigger PostgreSQL stored procedure maintenance tasks"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <Card key={job} className="flex items-start gap-4">
            <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Activity className="w-5 h-5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-600 text-surface-900 text-sm mb-1 font-mono">
                {job}
              </p>
              <p className="text-xs text-surface-600 leading-relaxed mb-4">
                {JOB_DESCRIPTIONS[job] || 'Maintenance procedure.'}
              </p>
              <Button
                size="sm"
                variant="outline"
                loading={triggeringJob === job}
                onClick={() => handleTrigger(job)}
                icon={<Play className="w-3.5 h-3.5" />}
              >
                Trigger Now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="card p-8 text-center">
          <Activity className="w-10 h-10 text-surface-500 mx-auto mb-3" />
          <p className="text-surface-600">No jobs registered. Ensure CRON_ENABLED=true on the backend.</p>
        </div>
      )}
    </div>
  );
}
