import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Badge, EmptyState, Skeleton } from '@/components/ui';
import { ChevronLeft, Clock, Lock } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

const ACTIONS = ['','approve_post','reject_post','ban_user','unban_user','delete_post','resolve_report','rotate_secret'];

const ACTION_COLOR: Record<string, string> = {
  approve_post: Colors.success, reject_post: Colors.warning,
  ban_user: Colors.error, unban_user: Colors.success,
  delete_post: Colors.error, resolve_report: Colors.info,
  rotate_secret: Colors.brand[500], feature_place: Colors.info,
};

export default function AdminAuditScreen() {
  const router = useRouter();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', action, page],
    queryFn: () => auditApi.list({ page, limit: 30, ...(action && { action }) }),
    placeholderData: keepPreviousData,
  });
  const { data: summaryData } = useQuery({
    queryKey: ['audit-summary'],
    queryFn: auditApi.getSummary,
  });

  const logs = (data?.data?.data?.logs ?? []) as Record<string, unknown>[];
  const total = data?.data?.data?.total ?? 0;
  const summary = (summaryData?.data?.data ?? []) as Record<string, unknown>[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.surface[800]} />
        </Pressable>
        <View>
          <Text style={styles.title}>Audit Log</Text>
          <Text style={styles.subtitle}>Immutable — {total} entries</Text>
        </View>
        <View style={styles.lockIcon}>
          <Lock size={16} color={Colors.brand[400]} />
        </View>
      </View>

      {/* Summary chips */}
      {summary.length > 0 && (
        <View style={styles.summaryRow}>
          {summary.slice(0, 4).map((s: Record<string, unknown>) => (
            <View key={String(s.action)} style={styles.summaryChip}>
              <Text style={styles.summaryValue}>{String(s.count)}</Text>
              <Text style={styles.summaryLabel}>{String(s.action).replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action filter */}
      <FlatList
        horizontal
        data={ACTIONS}
        keyExtractor={a => a || 'all'}
        contentContainerStyle={styles.filterRow}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: a }) => (
          <Pressable
            onPress={() => { setAction(a); setPage(1); }}
            style={[styles.filterBtn, action === a && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, action === a && styles.filterTextActive]}>
              {a || 'All'}
            </Text>
          </Pressable>
        )}
      />

      {/* Log entries */}
      {isLoading ? (
        <View style={{ padding: Spacing[4] }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={68} style={{ marginBottom: 8 }} />)}
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={l => String(l.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon={<Clock size={28} color={Colors.surface[500]} />} title="No audit entries" />
          }
          renderItem={({ item: l }) => {
            const color = ACTION_COLOR[String(l.action)] ?? Colors.surface[600];
            return (
              <View style={styles.logEntry}>
                <View style={[styles.logDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.logTop}>
                    <Badge color={color}>{String(l.action).replace(/_/g, ' ')}</Badge>
                    <Badge color={Colors.surface[600]}>{String(l.target_type)}</Badge>
                  </View>
                  <View style={styles.logMeta}>
                    <Text style={styles.logAdmin}>
                      {l.admin_handle ? `@${l.admin_handle}` : 'System'}
                    </Text>
                    {Boolean(l.reason) && (
                      <Text style={styles.logReason} numberOfLines={1}>· {String(l.reason)}</Text>
                    )}
                    <Text style={styles.logTime}>
                      {formatDistanceToNow(new Date(String(l.created_at)), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={{ padding: Spacing[4] }}>
              {Number(total) > page * 30 && (
                <Pressable onPress={() => setPage(p => p + 1)} style={styles.loadMore}>
                  <Text style={styles.loadMoreText}>Load more</Text>
                </Pressable>
              )}
              <View style={{ height: 80 }} />
            </View>
          }
        />
      )}
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
  lockIcon: {
    marginLeft: 'auto', width: 36, height: 36, borderRadius: Radius.lg,
    backgroundColor: `${Colors.brand[500]}15`, alignItems: 'center', justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: Spacing[3], paddingHorizontal: Spacing[4], marginBottom: Spacing[3] },
  summaryChip: {
    flex: 1, backgroundColor: Colors.surface[100], borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surface[200], padding: Spacing[3], alignItems: 'center',
  },
  summaryValue: { fontFamily: Typography.families.display, fontSize: Typography.sizes.lg, color: Colors.surface[900] },
  summaryLabel: { fontFamily: Typography.families.body, fontSize: 9, color: Colors.surface[600], marginTop: 2, textAlign: 'center' },
  filterRow: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[3], gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
  },
  filterBtnActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  filterText: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[600] },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing[4] },
  logEntry: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[2],
  },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  logTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  logMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  logAdmin: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[700] },
  logReason: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500], flex: 1 },
  logTime: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  loadMore: {
    padding: Spacing[4], backgroundColor: Colors.surface[100],
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center',
  },
  loadMoreText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.brand[400] },
});
