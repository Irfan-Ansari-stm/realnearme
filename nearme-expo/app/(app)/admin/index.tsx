import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { adminApi } from '@/api';
import { useAuthStore } from '@/store';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Card, Button, Skeleton, EmptyState, Badge } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import {
  Users, FileText, MapPin, Bookmark, Flag, Cpu,
  Bell, Activity, Play, ChevronRight, BarChart2,
  Shield, Clock, Zap, RefreshCw, ChevronLeft,
} from 'lucide-react-native';

const JOBS = [
  { name: 'cleanup_expired_cache',         label: 'Clean Cache',         desc: 'Deletes expired places_cache entries' },
  { name: 'cleanup_expired_notifications', label: 'Clean Notifications',  desc: 'Remove notifications older than 90 days' },
  { name: 'cleanup_expired_rate_limits',   label: 'Clean Rate Limits',   desc: 'Purge expired rate limit windows' },
  { name: 'gdpr_hard_delete',              label: 'GDPR Hard Delete',    desc: 'Hard-deletes users past their deadline' },
  { name: 'cleanup_post_tombstones',       label: 'Clean Tombstones',    desc: 'Purge soft-deleted posts > 90 days' },
  { name: 'cleanup_old_reports',           label: 'Clean Reports',       desc: 'Delete resolved reports > 1 year' },
  { name: 'cleanup_feed_ranking_log',      label: 'Clean Feed Log',      desc: 'Remove feed analytics > 90 days' },
];

const ADMIN_LINKS = [
  { label: 'Users',      href: '/(app)/admin/users',      icon: Users },
  { label: 'Posts',      href: '/(app)/admin/posts',       icon: FileText },
  { label: 'Moderation', href: '/(app)/admin/moderation', icon: Shield },
  { label: 'Reports',    href: '/(app)/admin/reports',     icon: Flag },
  { label: 'Places',     href: '/(app)/admin/places',      icon: MapPin },
  { label: 'Sessions',   href: '/(app)/admin/sessions',    icon: Cpu },
  { label: 'Audit Log',  href: '/(app)/admin/audit',       icon: Clock },
  { label: 'Algorithm',  href: '/(app)/admin/algorithm',   icon: Zap },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthStore();
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const { data: dashData, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    refetchInterval: 60_000,
  });
  const { data: searchData } = useQuery({
    queryKey: ['search-trends'],
    queryFn: () => adminApi.getSearchAnalytics(8),
  });

  const handleTrigger = async (job: string) => {
    setTriggeringJob(job);
    try {
      await adminApi.triggerJob(job);
      toast.success(`Job "${job}" completed`);
    } catch {
      toast.error('Failed to trigger job');
    } finally {
      setTriggeringJob(null);
    }
  };

  const d = dashData?.data?.data as Record<string, Record<string, number>> | null;
  const searchTrends = (searchData?.data?.data ?? []) as Record<string, unknown>[];

  const statCards = d ? [
    { label: 'Total Users',     value: d.users?.total_users ?? 0,         icon: Users,    color: Colors.brand[500] },
    { label: 'Active Users',    value: d.users?.active_users ?? 0,         icon: Users,    color: Colors.success },
    { label: 'Pending Posts',   value: d.posts?.pending_moderation ?? 0,   icon: FileText, color: Colors.warning },
    { label: 'Pending Reports', value: d.reports?.pending_reports ?? 0,    icon: Flag,     color: Colors.error },
    { label: 'Active Sessions', value: d.sessions?.active_sessions ?? 0,   icon: Cpu,      color: Colors.info },
    { label: 'Unread Notifs',   value: d.notifications?.unread_notifications ?? 0, icon: Bell, color: Colors.brand[500] },
    { label: 'Total Places',    value: d.places?.total_places ?? 0,        icon: MapPin,   color: Colors.success },
    { label: 'Total Saves',     value: d.saves?.total_saves ?? 0,          icon: Bookmark, color: Colors.info },
  ] : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={Colors.surface[800]} />
          </Pressable>
          <View>
            <Text style={styles.title}>Admin</Text>
            <Text style={styles.subtitle}>Dashboard — @{user?.handle}</Text>
          </View>
          <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
            <RefreshCw size={17} color={Colors.surface[700]} />
          </Pressable>
        </View>

        {/* Stat cards grid */}
        {isLoading ? (
          <View style={styles.statsGrid}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={90} style={styles.statCard} />)}
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsGrid}>
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <View key={i} style={[styles.statCard, { backgroundColor: Colors.surface[100] }]}>
                  <View style={[styles.statIcon, { backgroundColor: `${s.color}20` }]}>
                    <Icon size={18} color={s.color} />
                  </View>
                  <Text style={styles.statValue}>{Number(s.value).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Recent activity */}
        {d?.recent_activity && (Array.isArray(d.recent_activity)) && d.recent_activity.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Card style={{ marginBottom: Spacing[4] }}>
              <Text style={styles.sectionTitle}>Recent Admin Activity</Text>
              {(d.recent_activity as Record<string, unknown>[]).slice(0, 5).map((a, i) => (
                <View key={i} style={styles.activityRow}>
                  <Badge color={Colors.brand[500]}>{String(a.action).replace('_', ' ')}</Badge>
                  <Text style={styles.activityAdmin}>@{String(a.admin_handle ?? 'system')}</Text>
                  <Text style={styles.activityTime}>
                    {formatDistanceToNow(new Date(String(a.created_at)), { addSuffix: true })}
                  </Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Navigation grid */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { marginBottom: Spacing[3] }]}>Management</Text>
          <View style={styles.navGrid}>
            {ADMIN_LINKS.map(({ label, href, icon: Icon }) => (
              <Pressable
                key={href}
                onPress={() => router.push(href as any)}
                style={styles.navCard}
              >
                <View style={styles.navIcon}>
                  <Icon size={22} color={Colors.brand[400]} />
                </View>
                <Text style={styles.navLabel}>{label}</Text>
                <ChevronRight size={14} color={Colors.surface[500]} />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Search trends */}
        {searchTrends.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <Card style={{ marginBottom: Spacing[4] }}>
              <Text style={[styles.sectionTitle, { marginBottom: Spacing[4] }]}>Search Trends (7d)</Text>
              {searchTrends.slice(0, 8).map((t, i) => (
                <View key={i} style={styles.trendRow}>
                  <Text style={styles.trendRank}>{i + 1}</Text>
                  <Text style={styles.trendQuery} numberOfLines={1}>{String(t.query)}</Text>
                  <Text style={styles.trendCount}>{String(t.search_count)}</Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Cron Jobs */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={[styles.sectionTitle, { marginBottom: Spacing[3] }]}>Maintenance Jobs</Text>
          {JOBS.map((job) => (
            <View key={job.name} style={styles.jobRow}>
              <View style={styles.jobIcon}>
                <Activity size={16} color={Colors.brand[400]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobLabel}>{job.label}</Text>
                <Text style={styles.jobDesc} numberOfLines={1}>{job.desc}</Text>
              </View>
              <Pressable
                onPress={() => handleTrigger(job.name)}
                disabled={triggeringJob === job.name}
                style={[styles.triggerBtn, triggeringJob === job.name && { opacity: 0.5 }]}
              >
                <Play size={14} color={Colors.brand[400]} />
              </Pressable>
            </View>
          ))}
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  scroll: { padding: Spacing[5] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: Spacing[5],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900] },
  subtitle: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
  refreshBtn: {
    marginLeft: 'auto', width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3], marginBottom: Spacing[5],
  },
  statCard: {
    width: '47%', padding: Spacing[4], borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.surface[200],
  },
  statIcon: {
    width: 36, height: 36, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[2],
  },
  statValue: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  statLabel: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[600], marginTop: 3 },
  sectionTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.lg, color: Colors.surface[900] },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.surface[200],
  },
  activityAdmin: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[700] },
  activityTime: { marginLeft: 'auto', fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3], marginBottom: Spacing[5] },
  navCard: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4],
  },
  navIcon: {
    width: 36, height: 36, borderRadius: Radius.lg,
    backgroundColor: `${Colors.brand[500]}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: { flex: 1, fontFamily: Typography.families.bodyMedium, fontSize: 13, color: Colors.surface[800] },
  trendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.surface[200],
  },
  trendRank: { fontFamily: Typography.families.displayMedium, fontSize: 12, color: Colors.surface[500], width: 18 },
  trendQuery: { flex: 1, fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[700] },
  trendCount: { fontFamily: Typography.families.displayMedium, fontSize: 13, color: Colors.brand[400] },
  jobRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[2],
  },
  jobIcon: {
    width: 36, height: 36, borderRadius: Radius.lg,
    backgroundColor: `${Colors.brand[500]}15`, alignItems: 'center', justifyContent: 'center',
  },
  jobLabel: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.surface[800] },
  jobDesc: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[600], marginTop: 2 },
  triggerBtn: {
    width: 36, height: 36, borderRadius: Radius.lg,
    backgroundColor: `${Colors.brand[500]}15`,
    alignItems: 'center', justifyContent: 'center',
  },
});
