import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/api';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Badge, EmptyState, Skeleton } from '@/components/ui';
import { ChevronLeft, Flag, Check, Trash2 } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = ['pending', 'reviewed_approved', 'reviewed_removed'];
const STATUS_COLOR: Record<string, string> = {
  pending: Colors.warning,
  reviewed_approved: Colors.success,
  reviewed_removed: Colors.error,
};
const REASON_EMOJI: Record<string, string> = {
  inappropriate: '🚫', spam: '📢', violence: '⚠️', copyright: '©️', other: '❓',
};

export default function AdminReportsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter, page],
    queryFn: () => reportsApi.adminList({ page, limit: 20, status: statusFilter }),
    placeholderData: keepPreviousData,
  });

  const resolveMut = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: 'reviewed_approved' | 'reviewed_removed' }) =>
      reportsApi.resolve(reportId, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Report resolved');
    },
    onError: () => toast.error('Failed'),
  });

  const reports = (data?.data?.data?.reports ?? []) as Record<string, unknown>[];
  const total = data?.data?.data?.total ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.surface[800]} />
        </Pressable>
        <View>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>{total} total</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {STATUSES.map(s => (
          <Pressable
            key={s}
            onPress={() => { setStatusFilter(s); setPage(1); }}
            style={[styles.filterBtn, statusFilter === s && { backgroundColor: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] }]}
          >
            <Text style={[styles.filterText, statusFilter === s && { color: '#fff' }]}>
              {s.replace('reviewed_', '').replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing[4] }}>
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={100} style={{ marginBottom: 10 }} />)}
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon={<Flag size={28} color={Colors.surface[500]} />} title="No reports found" />
          }
          renderItem={({ item: r }) => (
            <View style={styles.reportCard}>
              <View style={styles.reportTop}>
                <Text style={styles.reason}>{REASON_EMOJI[String(r.reason)]} {String(r.reason)}</Text>
                <Badge color={STATUS_COLOR[String(r.status)] ?? Colors.surface[500]}>
                  {String(r.status).replace('_', ' ')}
                </Badge>
              </View>

              {Boolean(r.caption) && (
                <Text style={styles.caption} numberOfLines={2}>"{String(r.caption)}"</Text>
              )}

              <View style={styles.reportMeta}>
                <Text style={styles.metaText}>@{String(r.reporter_handle ?? 'unknown')}</Text>
                <Text style={styles.metaTime}>
                  {formatDistanceToNow(new Date(String(r.created_at)), { addSuffix: true })}
                </Text>
              </View>

              {String(r.status) === 'pending' && (
                <View style={styles.reportActions}>
                  <Pressable
                    onPress={() => resolveMut.mutate({ reportId: String(r.id), action: 'reviewed_approved' })}
                    style={[styles.actionBtn, styles.approveBtn]}
                  >
                    <Check size={14} color={Colors.success} />
                    <Text style={[styles.actionText, { color: Colors.success }]}>Keep Post</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => resolveMut.mutate({ reportId: String(r.id), action: 'reviewed_removed' })}
                    style={[styles.actionBtn, styles.removeBtn]}
                  >
                    <Trash2 size={14} color={Colors.error} />
                    <Text style={[styles.actionText, { color: Colors.error }]}>Remove Post</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
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
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing[4], marginBottom: Spacing[3] },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.surface[150],
    borderWidth: 1, borderColor: Colors.surface[200],
  },
  filterText: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[600] },
  list: { paddingHorizontal: Spacing[4] },
  reportCard: {
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[3],
  },
  reportTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  reason: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.surface[800] },
  caption: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600], fontStyle: 'italic', lineHeight: 18, marginBottom: 8 },
  reportMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metaText: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
  metaTime: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  reportActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: Radius.lg, borderWidth: 1,
  },
  approveBtn: { backgroundColor: `${Colors.success}12`, borderColor: `${Colors.success}30` },
  removeBtn: { backgroundColor: `${Colors.error}12`, borderColor: `${Colors.error}30` },
  actionText: { fontFamily: Typography.families.displayMedium, fontSize: 12 },
});
