import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '@/api';
import { useAuthStore } from '@/store';
import { useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius, CATEGORY_EMOJI, CATEGORY_COLOR } from '@/theme';
import { Card, Badge, Button, Avatar, Skeleton, EmptyState } from '@/components/ui';
import { ReportSheet } from '@/components/posts/ReportSheet';
import {
  ChevronLeft, Heart, Bookmark, Flag, MapPin, Camera,
  Clock, User,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuthStore();
  const [showReport, setShowReport] = useState(false);

  const { data: postData, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsApi.getById(postId),
  });
  const { data: likedData, refetch: refetchLiked } = useQuery({
    queryKey: ['post-liked', postId],
    queryFn: () => postsApi.checkLiked(postId),
  });
  const { data: likesData, refetch: refetchLikes } = useQuery({
    queryKey: ['post-likes', postId],
    queryFn: () => postsApi.getLikes(postId, { page: 1, limit: 10 }),
  });

  const post = postData?.data?.data as Record<string, unknown> | null;
  const isLiked = likedData?.data?.data?.is_liked ?? false;
  const likeCount = post?.like_count ?? 0;
  const likes = (likesData?.data?.data?.likes ?? []) as Record<string, unknown>[];

  const likeMut = useMutation({
    mutationFn: () => isLiked ? postsApi.unlike(postId) : postsApi.like(postId),
    onSuccess: () => {
      refetchLiked();
      qc.invalidateQueries({ queryKey: ['post', postId] });
      toast.success(isLiked ? 'Unliked' : 'Liked!');
    },
    onError: () => toast.error('Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: () => postsApi.delete(postId),
    onSuccess: () => { toast.success('Post deleted'); router.back(); },
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ padding: Spacing[5] }}>
          <Skeleton height={320} style={{ marginBottom: 16 }} />
          <Skeleton height={20} width="60%" style={{ marginBottom: 10 }} />
          <Skeleton height={14} width="40%" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState icon={<Camera size={32} color={Colors.surface[500]} />} title="Post not found" />
      </SafeAreaView>
    );
  }

  const catColor = CATEGORY_COLOR[String(post.category)] ?? Colors.surface[500];
  const isOwner = user?.id === String(post.user_id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={Colors.surface[800]} />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setShowReport(true)} style={styles.headerBtn}>
              <Flag size={17} color={Colors.error} />
            </Pressable>
            {isOwner && (
              <Pressable onPress={() => deleteMut.mutate()} style={styles.headerBtn}>
                <Text style={{ fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.error }}>Delete</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Media */}
        <View style={styles.mediaWrap}>
          {post.storage_ref ? (
            <Image
              source={{ uri: `https://storage.googleapis.com/${post.storage_ref}` }}
              style={styles.media}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.media, styles.mediaPlaceholder]}>
              <Camera size={48} color={Colors.surface[500]} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Author */}
          <View style={styles.authorRow}>
            <Avatar
              uri={String(post.author_photo ?? '')}
              name={String(post.author_name ?? '?')}
              size={40}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{String(post.author_name ?? 'Unknown')}</Text>
              <Text style={styles.authorHandle}>@{String(post.author_handle ?? '')}</Text>
            </View>
            <Text style={styles.postTime}>
              {formatDistanceToNow(new Date(String(post.created_at)), { addSuffix: true })}
            </Text>
          </View>

          {/* Caption */}
          {Boolean(post.caption) && (
            <Text style={styles.caption}>{String(post.caption)}</Text>
          )}

          {/* Tags */}
          <View style={styles.tagsRow}>
            <Badge color={catColor}>{CATEGORY_EMOJI[String(post.category)]} {String(post.category)}</Badge>
            {(post.vibes as string[])?.map((v: string) => (
              <Badge key={v} color={Colors.surface[600]}>{v.replace('_', ' ')}</Badge>
            ))}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {/* Like button */}
            <Pressable
              onPress={() => likeMut.mutate()}
              style={[styles.likeBtn, isLiked && styles.likeBtnActive]}
              disabled={likeMut.isPending}
            >
              <Heart
                size={18}
                color={isLiked ? '#fff' : Colors.surface[600]}
                fill={isLiked ? '#fff' : 'transparent'}
              />
              <Text style={[styles.likeCount, isLiked && { color: '#fff' }]}>
                {Number(likeCount).toLocaleString()}
              </Text>
            </Pressable>

            {/* Place link */}
            <Pressable
              onPress={() => router.push(`/(app)/place/${post.place_id}`)}
              style={styles.placeBtn}
            >
              <MapPin size={14} color={Colors.brand[400]} />
              <Text style={styles.placeBtnText}>View Place</Text>
            </Pressable>
          </View>

          {/* Status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Badge color={
              String(post.status) === 'approved' ? Colors.success :
              String(post.status) === 'pending_moderation' ? Colors.warning : Colors.error
            }>
              {String(post.status).replace('_', ' ')}
            </Badge>
          </View>

          {/* Who liked */}
          {likes.length > 0 && (
            <View style={styles.likesSection}>
              <Text style={styles.likesSectionTitle}>Liked by</Text>
              <View style={styles.likersList}>
                {likes.slice(0, 5).map((l: Record<string, unknown>) => (
                  <Pressable
                    key={String(l.user_id)}
                    onPress={() => router.push(`/(app)/user/${l.handle}`)}
                    style={styles.liker}
                  >
                    <Avatar
                      uri={String(l.photo_url ?? '')}
                      name={String(l.display_name ?? '?')}
                      size={32}
                    />
                    <Text style={styles.likerHandle}>@{String(l.handle ?? '')}</Text>
                  </Pressable>
                ))}
                {likes.length > 5 && (
                  <Text style={styles.moreLikes}>+{likes.length - 5} more</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <ReportSheet
        postId={postId}
        visible={showReport}
        onClose={() => setShowReport(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing[3],
  },
  headerTitle: { flex: 1, fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  headerBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  mediaWrap: { width: '100%', aspectRatio: 4 / 3, backgroundColor: Colors.surface[150] },
  media: { width: '100%', height: '100%' },
  mediaPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing[5] },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing[4] },
  authorName: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.base, color: Colors.surface[900] },
  authorHandle: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
  postTime: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  caption: {
    fontFamily: Typography.families.body, fontSize: Typography.sizes.base,
    color: Colors.surface[800], lineHeight: 22, marginBottom: Spacing[4],
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing[5] },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing[4] },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.full,
  },
  likeBtnActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  likeCount: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.surface[700] },
  placeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: `${Colors.brand[500]}15`, borderWidth: 1, borderColor: `${Colors.brand[500]}35`,
    borderRadius: Radius.full,
  },
  placeBtnText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.brand[400] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing[5] },
  statusLabel: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  likesSection: { borderTopWidth: 1, borderTopColor: Colors.surface[200], paddingTop: Spacing[4] },
  likesSectionTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900], marginBottom: Spacing[3] },
  likersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  liker: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, backgroundColor: Colors.surface[100], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surface[200] },
  likerHandle: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[700] },
  moreLikes: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[500], alignSelf: 'center' },
});
