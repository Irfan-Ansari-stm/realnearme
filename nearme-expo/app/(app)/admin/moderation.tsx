import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '@/api';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { Badge, EmptyState, Skeleton } from '@/components/ui';
import { ChevronLeft, Check, X, Camera, Flag } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

export default function AdminModerationScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mod-queue'],
    queryFn: () => postsApi.getModerationQ({ page: 1, limit: 30 }),
    refetchInterval: 30_000,
  });

  const moderateMut = useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: 'approve' | 'reject' }) =>
      postsApi.moderate(postId, { action }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['mod-queue'] });
      toast.success(`Post ${action}d`);
    },
    onError: () => toast.error('Action failed'),
  });

  const posts = (data?.data?.data?.posts ?? []) as Record<string, unknown>[];
  const total = data?.data?.data?.total ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.surface[800]} />
        </Pressable>
        <View>
          <Text style={styles.title}>Moderation Queue</Text>
          <Text style={styles.subtitle}>{total} items need review</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing[4] }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={120} style={{ marginBottom: 12 }} />)}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={false}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyState
              icon={<Check size={32} color={Colors.success} />}
              title="Queue is empty"
              description="All posts have been reviewed"
            />
          }
          renderItem={({ item: p }) => (
            <View style={styles.card}>
              {/* Thumbnail */}
              <View style={styles.thumbWrap}>
                {p.storage_ref ? (
                  <Image
                    source={{ uri: `https://storage.googleapis.com/${p.storage_ref}` }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Camera size={24} color={Colors.surface[500]} />
                  </View>
                )}
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <Badge color={Colors.warning}>{String(p.status).replace('_', ' ')}</Badge>
                  <Badge color={Colors.brand[500]}>{String(p.category)}</Badge>
                  {Number(p.report_count) >= 3 && (
                    <Badge color={Colors.error}>⚠ {String(p.report_count)} reports</Badge>
                  )}
                </View>

                <Text style={styles.caption} numberOfLines={2}>
                  {String(p.caption || 'No caption')}
                </Text>
                <Text style={styles.author}>
                  @{String(p.author_handle)} · {formatDistanceToNow(new Date(String(p.created_at)), { addSuffix: true })}
                </Text>

                {/* Actions */}
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => moderateMut.mutate({ postId: String(p.id), action: 'approve' })}
                    style={[styles.actionBtn, styles.approveBtn]}
                    disabled={moderateMut.isPending}
                  >
                    <Check size={16} color={Colors.success} />
                    <Text style={[styles.actionText, { color: Colors.success }]}>Approve</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => moderateMut.mutate({ postId: String(p.id), action: 'reject' })}
                    style={[styles.actionBtn, styles.rejectBtn]}
                    disabled={moderateMut.isPending}
                  >
                    <X size={16} color={Colors.error} />
                    <Text style={[styles.actionText, { color: Colors.error }]}>Reject</Text>
                  </Pressable>
                </View>
              </View>
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
  list: { padding: Spacing[4] },
  card: {
    flexDirection: 'row', gap: 14,
    backgroundColor: Colors.surface[100], borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.surface[200],
    padding: Spacing[4], marginBottom: Spacing[3],
  },
  thumbWrap: { flexShrink: 0 },
  thumb: { width: 88, height: 88, borderRadius: Radius.lg },
  thumbPlaceholder: { backgroundColor: Colors.surface[200], alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  caption: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[700], lineHeight: 18, marginBottom: 4 },
  author: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500], marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: Radius.lg, borderWidth: 1,
  },
  approveBtn: { backgroundColor: `${Colors.success}12`, borderColor: `${Colors.success}30` },
  rejectBtn: { backgroundColor: `${Colors.error}12`, borderColor: `${Colors.error}30` },
  actionText: { fontFamily: Typography.families.displayMedium, fontSize: Typography.sizes.sm },
});
