// ─── Admin Algorithm Screen ────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { algorithmApi, postsApi, placesApi, sessionsApi } from '@/api';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius, CATEGORY_EMOJI, CATEGORY_COLOR } from '@/theme';
import { Badge, Button, EmptyState, Skeleton, SheetModal, Card } from '@/components/ui';
import { ChevronLeft, Zap, Check, Camera, MapPin, Cpu, Trash2 } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

export function AlgorithmScreenContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: versionsData } = useQuery({ queryKey: ['algorithm-versions'], queryFn: algorithmApi.list });
  const { data: activeData } = useQuery({ queryKey: ['algorithm-active'], queryFn: algorithmApi.getActive });

  const activateMut = useMutation({
    mutationFn: (v: string) => algorithmApi.activate(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['algorithm-versions'] });
      qc.invalidateQueries({ queryKey: ['algorithm-active'] });
      toast.success('Version activated');
    },
    onError: () => toast.error('Failed'),
  });

  const versions = (versionsData?.data?.data ?? []) as Record<string, unknown>[];
  const active = activeData?.data?.data as Record<string, unknown> | null;

  const WEIGHT_LABELS: Record<string, string> = {
    proximity: 'Proximity', rating: 'Rating', vibe: 'Vibe',
    category: 'Category', recency: 'Recency', popularity: 'Popularity',
  };

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing[5] }}>
      {/* Active version */}
      {active && (
        <Card style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <Zap size={18} color={Colors.brand[400]} />
            <Text style={styles.activeTitle}>Active: v{String(active.version)}</Text>
            <Badge color={Colors.success}>Live</Badge>
          </View>
          {Boolean(active.weights) && (
            <View style={styles.weightsWrap}>
              {Object.entries(active.weights as Record<string, number>).map(([k, v]) => (
                <View key={k} style={styles.weightItem}>
                  <View style={styles.weightBarWrap}>
                    <View style={[styles.weightBar, { height: `${v * 100}%` as any, backgroundColor: Colors.brand[500] }]} />
                  </View>
                  <Text style={styles.weightPct}>{Math.round(v * 100)}%</Text>
                  <Text style={styles.weightLabel}>{WEIGHT_LABELS[k] ?? k}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* All versions */}
      <Text style={styles.sectionTitle}>All Versions</Text>
      {versions.map((v: Record<string, unknown>) => (
        <View key={String(v.version)} style={styles.versionRow}>
          <Text style={styles.versionNum}>v{String(v.version)}</Text>
          {v.is_active
            ? <Badge color={Colors.success}>Active</Badge>
            : (
              <Button
                size="sm" variant="outline"
                onPress={() => activateMut.mutate(String(v.version))}
                loading={activateMut.isPending}
              >
                Activate
              </Button>
            )
          }
          <Text style={styles.versionBy}>by {String(v.deployed_by ?? 'system')}</Text>
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

export function PostsScreenContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts-list', status, page],
    queryFn: () => postsApi.adminList({ page, limit: 20, ...(status && { status }) }),
    placeholderData: keepPreviousData,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => postsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-posts-list'] }); toast.success('Post deleted'); },
    onError: () => toast.error('Failed'),
  });

  const moderateMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => postsApi.moderate(id, { action }),
    onSuccess: (_, { action }) => { qc.invalidateQueries({ queryKey: ['admin-posts-list'] }); toast.success(`Post ${action}d`); },
  });

  const posts = (data?.data?.data?.posts ?? []) as Record<string, unknown>[];
  const STATUS_COLOR_MAP: Record<string, string> = {
    pending_moderation: Colors.warning, approved: Colors.success, rejected: Colors.error, deleted: Colors.surface[600],
  };

  return (
    <>
      <FlatList
        horizontal data={['','pending_moderation','approved','rejected']}
        keyExtractor={s => s || 'all'}
        contentContainerStyle={{ paddingHorizontal: Spacing[4], paddingBottom: Spacing[3], gap: 8 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: s }) => (
          <Pressable
            onPress={() => { setStatus(s); setPage(1); }}
            style={[styles.filterBtn2, status === s && { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] }]}
          >
            <Text style={[{ fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[600] }, status === s && { color: '#fff' }]}>
              {s || 'All'}
            </Text>
          </Pressable>
        )}
      />
      <FlatList
        data={posts}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: Spacing[4] }}
        ListEmptyComponent={<EmptyState icon={<Camera size={28} color={Colors.surface[500]} />} title="No posts" />}
        renderItem={({ item: p }) => (
          <View style={styles.postAdminRow}>
            <View style={styles.postAdminThumb}>
              {p.storage_ref
                ? <Image source={{ uri: `https://storage.googleapis.com/${p.storage_ref}` }} style={{ flex: 1, borderRadius: Radius.lg }} resizeMode="cover" />
                : <Camera size={20} color={Colors.surface[500]} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.postAdminCaption} numberOfLines={1}>{String(p.caption || 'No caption')}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge color={STATUS_COLOR_MAP[String(p.status)] ?? Colors.surface[500]}>{String(p.status).replace('_', ' ')}</Badge>
                <Badge color={Colors.brand[500]}>{String(p.category)}</Badge>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {String(p.status) === 'pending_moderation' && (
                <>
                  <Pressable onPress={() => moderateMut.mutate({ id: String(p.id), action: 'approve' })} style={styles.smallBtn}>
                    <Check size={14} color={Colors.success} />
                  </Pressable>
                </>
              )}
              <Pressable onPress={() => deleteMut.mutate(String(p.id))} style={styles.smallBtn}>
                <Trash2 size={14} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </>
  );
}

export function PlacesScreenContent() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-places-list', page],
    queryFn: () => placesApi.adminList({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const places = (data?.data?.data?.places ?? []) as Record<string, unknown>[];

  return (
    <FlatList
      data={places}
      keyExtractor={p => String(p.place_id)}
      contentContainerStyle={{ paddingHorizontal: Spacing[4] }}
      ListEmptyComponent={<EmptyState icon={<MapPin size={28} color={Colors.surface[500]} />} title="No cached places" />}
      renderItem={({ item: p }) => {
        const cat = String(p.category ?? 'other');
        const color = CATEGORY_COLOR[cat] ?? Colors.surface[500];
        return (
          <View style={styles.placeAdminRow}>
            <View style={[styles.placeAdminEmoji, { backgroundColor: `${color}20` }]}>
              <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[cat] ?? '📍'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeAdminName} numberOfLines={1}>{String(p.name)}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge color={color}>{cat}</Badge>
                <Text style={styles.placeSaves}>💾 {String(p.save_count ?? 0)}</Text>
              </View>
            </View>
          </View>
        );
      }}
      ListFooterComponent={<View style={{ height: 100 }} />}
    />
  );
}

export function SessionsScreenContent() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-sessions-list'],
    queryFn: () => sessionsApi.adminList({ page: 1, limit: 30 }),
  });

  const revokeMut = useMutation({
    mutationFn: (uid: string) => sessionsApi.adminRevoke(uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-sessions-list'] }); toast.success('Sessions revoked'); },
  });

  const sessions = (data?.data?.data?.sessions ?? []) as Record<string, unknown>[];

  return (
    <FlatList
      data={sessions}
      keyExtractor={s => String(s.id)}
      contentContainerStyle={{ paddingHorizontal: Spacing[4] }}
      ListEmptyComponent={<EmptyState icon={<Cpu size={28} color={Colors.surface[500]} />} title="No active sessions" />}
      renderItem={({ item: s }) => (
        <View style={styles.sessionRow}>
          <View style={styles.sessionIcon}>
            <Cpu size={16} color={Colors.surface[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionUser}>{String(s.display_name ?? 'Unknown')} (@{String(s.handle ?? '?')})</Text>
            <Text style={styles.sessionDevice}>{(s.device_info as Record<string, string>)?.platform ?? 'Unknown device'}</Text>
            <Text style={styles.sessionTime}>
              Active {formatDistanceToNow(new Date(String(s.last_used_at)), { addSuffix: true })}
            </Text>
          </View>
          <Pressable onPress={() => revokeMut.mutate(String(s.user_id))} style={styles.revokeBtn}>
            <Text style={styles.revokeText}>Revoke</Text>
          </Pressable>
        </View>
      )}
      ListFooterComponent={<View style={{ height: 100 }} />}
    />
  );
}

// ─── Screen wrappers ───────────────────────────────────────────────────────────
function AdminScreenWrapper({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.surface[800]} />
        </Pressable>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </SafeAreaView>
  );
}

export default function AdminAlgorithmScreen() {
  return (
    <AdminScreenWrapper title="Algorithm Config" subtitle="Feed ranking weights">
      <AlgorithmScreenContent />
    </AdminScreenWrapper>
  );
}

// We export named screens so they can be used in separate files
export function AdminPostsScreen() {
  return <AdminScreenWrapper title="Posts Management"><PostsScreenContent /></AdminScreenWrapper>;
}
export function AdminPlacesScreen() {
  return <AdminScreenWrapper title="Places Cache"><PlacesScreenContent /></AdminScreenWrapper>;
}
export function AdminSessionsScreen() {
  return <AdminScreenWrapper title="Active Sessions"><SessionsScreenContent /></AdminScreenWrapper>;
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
  sectionTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.lg, color: Colors.surface[900], marginBottom: Spacing[3] },
  activeCard: { marginBottom: Spacing[5], borderColor: `${Colors.brand[500]}30`, backgroundColor: `${Colors.brand[500]}08` },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing[4] },
  activeTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900], flex: 1 },
  weightsWrap: { flexDirection: 'row', gap: 12, height: 100, alignItems: 'flex-end' },
  weightItem: { flex: 1, alignItems: 'center' },
  weightBarWrap: { width: '100%', height: 70, backgroundColor: Colors.surface[200], borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  weightBar: { width: '100%', borderRadius: 4 },
  weightPct: { fontFamily: Typography.families.displayMedium, fontSize: 11, color: Colors.brand[400], marginTop: 4 },
  weightLabel: { fontFamily: Typography.families.body, fontSize: 9, color: Colors.surface[600], marginTop: 2, textAlign: 'center' },
  versionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[2],
  },
  versionNum: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900], flex: 1 },
  versionBy: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  filterBtn2: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
  },
  postAdminRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[3], marginBottom: Spacing[2],
  },
  postAdminThumb: {
    width: 56, height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[200], overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  postAdminCaption: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[800] },
  smallBtn: {
    width: 30, height: 30, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], alignItems: 'center', justifyContent: 'center',
  },
  placeAdminRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[3], marginBottom: Spacing[2],
  },
  placeAdminEmoji: {
    width: 48, height: 48, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  placeAdminName: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.base, color: Colors.surface[900] },
  placeSaves: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[2],
  },
  sessionIcon: {
    width: 36, height: 36, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[200], alignItems: 'center', justifyContent: 'center',
  },
  sessionUser: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.surface[900] },
  sessionDevice: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
  sessionTime: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${Colors.error}12`, borderRadius: Radius.lg, borderWidth: 1, borderColor: `${Colors.error}30` },
  revokeText: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.error },
});
