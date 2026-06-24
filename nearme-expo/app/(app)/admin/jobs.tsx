import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { EmptyState, Skeleton } from '@/components/ui';
import { ChevronLeft, Activity, Play, CheckCircle } from 'lucide-react-native';

const JOB_INFO: Record<string, { label: string; desc: string; color: string }> = {
  cleanup_expired_cache:         { label: 'Clean Cache',         desc: 'Delete expired places_cache & place_detail_cache rows', color: Colors.brand[500] },
  cleanup_expired_notifications: { label: 'Clean Notifications', desc: 'Remove notifications older than 90 days (GDPR)', color: Colors.info },
  cleanup_expired_rate_limits:   { label: 'Clean Rate Limits',   desc: 'Purge expired rate limit counter windows', color: Colors.success },
  gdpr_hard_delete:              { label: 'GDPR Hard Delete',    desc: 'Hard-delete users past their 30-day deletion deadline', color: Colors.error },
  cleanup_post_tombstones:       { label: 'Clean Tombstones',    desc: 'Permanently remove soft-deleted posts older than 90 days', color: Colors.warning },
  cleanup_old_reports:           { label: 'Clean Old Reports',   desc: 'Delete resolved reports older than 1 year', color: Colors.brand[500] },
  cleanup_feed_ranking_log:      { label: 'Clean Feed Log',      desc: 'Remove feed analytics entries older than 90 days', color: Colors.info },
};

export default function AdminJobsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [completedJobs, setCompletedJobs] = useState<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: adminApi.listJobs,
  });

  const jobs: string[] = data?.data?.data?.jobs ?? Object.keys(JOB_INFO);

  const handleTrigger = async (jobName: string) => {
    setTriggeringJob(jobName);
    try {
      await adminApi.triggerJob(jobName);
      toast.success(`"${JOB_INFO[jobName]?.label ?? jobName}" completed`);
      setCompletedJobs(prev => { const n = new Set(prev); n.add(jobName); return n; });
    } catch {
      toast.error('Failed to trigger job');
    } finally {
      setTriggeringJob(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.surface[800]} />
        </Pressable>
        <View>
          <Text style={styles.title}>Maintenance Jobs</Text>
          <Text style={styles.subtitle}>{jobs.length} scheduled procedures</Text>
        </View>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={j => j}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={<Activity size={28} color={Colors.surface[500]} />} title="No jobs registered" />}
        renderItem={({ item: job }) => {
          const info = JOB_INFO[job];
          const isRunning = triggeringJob === job;
          const isDone = completedJobs.has(job);
          const color = info?.color ?? Colors.brand[500];

          return (
            <View style={styles.jobCard}>
              {/* Icon */}
              <View style={[styles.jobIcon, { backgroundColor: `${color}18` }]}>
                {isDone
                  ? <CheckCircle size={20} color={Colors.success} />
                  : <Activity size={20} color={color} />
                }
              </View>

              {/* Content */}
              <View style={styles.jobContent}>
                <Text style={styles.jobLabel}>{info?.label ?? job}</Text>
                <Text style={styles.jobDesc}>{info?.desc ?? 'Maintenance procedure'}</Text>
                <Text style={styles.jobName}>{job}</Text>
              </View>

              {/* Trigger button */}
              <Pressable
                onPress={() => handleTrigger(job)}
                disabled={isRunning}
                style={[
                  styles.triggerBtn,
                  { borderColor: `${color}40` },
                  isRunning && { opacity: 0.5 },
                  isDone && { borderColor: `${Colors.success}40` },
                ]}
              >
                {isRunning ? (
                  <Activity size={16} color={color} />
                ) : isDone ? (
                  <CheckCircle size={16} color={Colors.success} />
                ) : (
                  <Play size={16} color={color} />
                )}
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  subtitle: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600], marginTop: 2 },
  list: { paddingHorizontal: Spacing[5] },
  jobCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[3],
  },
  jobIcon: {
    width: 44, height: 44, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  jobContent: { flex: 1 },
  jobLabel: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.base, color: Colors.surface[900] },
  jobDesc: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600], lineHeight: 17, marginTop: 2 },
  jobName: { fontFamily: Typography.families.mono, fontSize: 10, color: Colors.surface[500], marginTop: 4 },
  triggerBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
