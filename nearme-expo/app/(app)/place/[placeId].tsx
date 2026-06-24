import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  FlatList, Image, Linking, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { placesApi, savesApi, postsApi } from '@/api';
import { useToast, useRefreshControl } from '@/hooks';
import { Colors, Typography, Spacing, Radius, CATEGORY_EMOJI, CATEGORY_COLOR, PRICE_LABELS } from '@/theme';
import {
  Card, Button, Badge, EmptyState, Skeleton,
  RatingStars, StatRow,
} from '@/components/ui';
import { ReportSheet } from '@/components/posts/ReportSheet';
import { CreatePostSheet } from '@/components/posts/CreatePostSheet';
import {
  MapPin, Star, Bookmark, BookmarkCheck, Phone, Globe,
  Clock, Camera, Heart, Flag, ChevronLeft, Plus, TrendingUp,
} from 'lucide-react-native';

export default function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Fetch place
  const { data: placeData, isLoading: placeLoading, refetch: refetchPlace } = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => placesApi.getById(placeId),
  });
  const { data: detailData } = useQuery({
    queryKey: ['place-detail', placeId],
    queryFn: () => placesApi.getDetail(placeId),
    retry: false,
  });
  const { data: saveCheckData, refetch: refetchSave } = useQuery({
    queryKey: ['save-check', placeId],
    queryFn: () => savesApi.checkSaved(placeId),
  });
  const { data: saveCountData, refetch: refetchCount } = useQuery({
    queryKey: ['save-count', placeId],
    queryFn: () => savesApi.getSaveCount(placeId),
  });
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['place-posts', placeId],
    queryFn: () => postsApi.getForPlace(placeId, { page: 1, limit: 12 }),
  });

  const place = placeData?.data?.data as Record<string, unknown> | null;
  const detail = detailData?.data?.data as Record<string, unknown> | null;
  const isSaved = saveCheckData?.data?.data?.is_saved ?? false;
  const saveCount = saveCountData?.data?.data?.save_count ?? 0;
  const posts = (postsData?.data?.data?.posts ?? []) as Record<string, unknown>[];

  const { refreshing, onRefresh } = useRefreshControl(async () => {
    await Promise.all([refetchPlace(), refetchSave(), refetchCount(), refetchPosts()]);
  });

  const saveMut = useMutation({
    mutationFn: () => isSaved
      ? savesApi.unsave(placeId)
      : savesApi.save({
          place_id: placeId,
          name: place?.name,
          category: place?.category,
          rating: place?.rating,
        }),
    onSuccess: () => {
      refetchSave(); refetchCount();
      toast.success(isSaved ? 'Removed from saves' : 'Place saved!');
    },
    onError: () => toast.error('Failed to update save'),
  });

  const likeMut = useMutation({
    mutationFn: (postId: string) => postsApi.like(postId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['place-posts', placeId] }); toast.success('Liked!'); },
  });

  if (placeLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ padding: Spacing[5] }}>
          <Skeleton height={240} style={{ marginBottom: 16 }} />
          <Skeleton height={28} width="60%" style={{ marginBottom: 10 }} />
          <Skeleton height={18} width="40%" style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} height={60} style={{ flex: 1 }} />)}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!place) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <EmptyState icon={<MapPin size={32} color={Colors.surface[500]} />} title="Place not found" />
    </SafeAreaView>
  );

  const catColor = CATEGORY_COLOR[String(place.category)] ?? Colors.surface[500];
  const photoUrls = (place.photo_urls as string[]) ?? [];
  const openNow = detail?.open_now ?? place.open_now;
  const hoursText = (detail?.opening_hours as Record<string, string[]>)?.weekday_text ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand[500]} />}
      >
        {/* Hero image */}
        <View style={styles.heroWrap}>
          {photoUrls.length > 0 ? (
            <Image source={{ uri: photoUrls[0] }} style={styles.hero} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPlaceholder]}>
              <Text style={{ fontSize: 64 }}>{CATEGORY_EMOJI[String(place.category)] ?? '📍'}</Text>
            </View>
          )}
          <View style={styles.heroOverlay} />

          {/* Back button */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#fff" />
          </Pressable>

          {/* Save button */}
          <Pressable onPress={() => saveMut.mutate()} style={styles.saveHeroBtn}>
            {isSaved
              ? <BookmarkCheck size={22} color={Colors.brand[400]} fill={Colors.brand[400]} />
              : <Bookmark size={22} color="#fff" />
            }
          </Pressable>

          {/* Open/closed */}
          {openNow !== null && (
            <View style={[styles.openBadge, { backgroundColor: openNow ? Colors.success : Colors.error }]}>
              <Text style={styles.openBadgeText}>{openNow ? '● Open' : '● Closed'}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName}>{String(place.name)}</Text>
              {Boolean(place.formatted_address) && (
                <Text style={styles.address} numberOfLines={2}>{String(place.formatted_address)}</Text>
              )}
            </View>
            {Boolean(place.price_level) && (
              <Text style={styles.price}>{PRICE_LABELS[String(place.price_level)] ?? String(place.price_level)}</Text>
            )}
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <Badge color={catColor}>{CATEGORY_EMOJI[String(place.category)]} {String(place.category)}</Badge>
            {(place.vibes as string[])?.slice(0, 2).map((v: string) => (
              <Badge key={v} color={Colors.surface[600]}>{v.replace('_', ' ')}</Badge>
            ))}
          </View>

          {/* Stats */}
          <StatRow items={[
            { label: 'Rating', value: place.rating ? `${Number(place.rating).toFixed(1)} ★` : '—' },
            { label: 'Reviews', value: Number(place.rating_count ?? 0) },
            { label: 'Saves', value: saveCount },
          ]} />

          {/* Contact */}
          {Boolean(detail?.phone || place.phone || detail?.website || place.website) && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Card style={{ marginTop: Spacing[4] }}>
                <Text style={styles.sectionTitle}>Contact</Text>
                {Boolean(detail?.phone || place.phone) && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${detail?.phone ?? place.phone}`)}
                    style={styles.contactRow}
                  >
                    <Phone size={16} color={Colors.brand[400]} />
                    <Text style={styles.contactText}>{String(detail?.phone ?? place.phone)}</Text>
                  </Pressable>
                )}
                {Boolean(detail?.website || place.website) && (
                  <Pressable
                    onPress={() => Linking.openURL(String(detail?.website ?? place.website))}
                    style={styles.contactRow}
                  >
                    <Globe size={16} color={Colors.brand[400]} />
                    <Text style={[styles.contactText, { color: Colors.brand[400] }]}>Visit website</Text>
                  </Pressable>
                )}
              </Card>
            </Animated.View>
          )}

          {/* Opening hours */}
          {hoursText.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Card style={{ marginTop: Spacing[4] }}>
                <View style={styles.hoursHeader}>
                  <Clock size={16} color={Colors.surface[600]} />
                  <Text style={styles.sectionTitle}>Opening Hours</Text>
                </View>
                {hoursText.map((t: string, i: number) => (
                  <Text key={i} style={styles.hourRow}>{t}</Text>
                ))}
              </Card>
            </Animated.View>
          )}

          {/* Community Posts */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={styles.postsHeader}>
              <Text style={styles.sectionTitle}>Community Posts</Text>
              <Pressable
                onPress={() => setShowCreatePost(true)}
                style={styles.addPostBtn}
              >
                <Plus size={16} color={Colors.brand[400]} />
                <Text style={styles.addPostText}>Add</Text>
              </Pressable>
            </View>

            {postsLoading ? (
              <View style={styles.postsGrid}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} height={120} style={styles.postGridItem} />)}
              </View>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={<Camera size={28} color={Colors.surface[500]} />}
                title="No posts yet"
                description="Be the first to share this place!"
                action={{ label: 'Add a post', onPress: () => setShowCreatePost(true) }}
              />
            ) : (
              <View style={styles.postsGrid}>
                {posts.map((post) => (
                  <Pressable
                    key={String(post.id)}
                    style={styles.postGridItem}
                    onPress={() => router.push(`/(app)/post/${post.id}`)}
                  >
                    {post.storage_ref ? (
                      <Image
                        source={{ uri: `https://storage.googleapis.com/${post.storage_ref}` }}
                        style={styles.postThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.postThumbPlaceholder}>
                        <Camera size={24} color={Colors.surface[500]} />
                      </View>
                    )}
                    <View style={styles.postOverlay}>
                      <View style={styles.postActions}>
                        <Pressable
                          onPress={() => likeMut.mutate(String(post.id))}
                          style={styles.postAction}
                        >
                          <Heart size={14} color="#fff" />
                          <Text style={styles.postActionText}>{String(post.like_count ?? 0)}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setReportPostId(String(post.id))}
                          style={styles.postAction}
                        >
                          <Flag size={14} color="#fff" />
                        </Pressable>
                      </View>
                      {Boolean(post.caption) && (
                        <Text style={styles.postCaption} numberOfLines={1}>{String(post.caption)}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Report sheet */}
      {reportPostId && (
        <ReportSheet
          postId={reportPostId}
          visible={!!reportPostId}
          onClose={() => setReportPostId(null)}
        />
      )}

      {/* Create post sheet */}
      <CreatePostSheet
        placeId={placeId}
        placeName={String(place.name)}
        placeCategory={String(place.category)}
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['place-posts', placeId] }); }}
      />
    </SafeAreaView>
  );
}

const GRID_ITEM_SIZE = (Spacing[1] * 100 - Spacing[4] * 2 - Spacing[3]) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  heroWrap: { height: 280, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  heroPlaceholder: {
    flex: 1, backgroundColor: Colors.surface[150],
    alignItems: 'center', justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  saveHeroBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  openBadge: {
    position: 'absolute', bottom: 16, left: 16,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  openBadgeText: { fontFamily: Typography.families.displayMedium, fontSize: 12, color: '#fff' },
  content: { padding: Spacing[5] },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing[3] },
  placeName: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900], flex: 1 },
  address: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600], marginTop: 4 },
  price: { fontFamily: Typography.families.displayMedium, fontSize: Typography.sizes.md, color: Colors.surface[600], marginLeft: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing[5] },
  sectionTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900], marginLeft: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.surface[200] },
  contactText: { fontFamily: Typography.families.body, fontSize: Typography.sizes.base, color: Colors.surface[700] },
  hoursHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[3] },
  hourRow: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600], lineHeight: 18 },
  postsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[6], marginBottom: Spacing[4] },
  addPostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: `${Colors.brand[500]}15`,
    borderRadius: Radius.full, borderWidth: 1, borderColor: `${Colors.brand[500]}35`,
  },
  addPostText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.brand[400] },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  postGridItem: {
    width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE,
    borderRadius: Radius.xl, overflow: 'hidden',
    backgroundColor: Colors.surface[150],
  },
  postThumb: { width: '100%', height: '100%' },
  postThumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  postOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 8,
  },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postActionText: { fontFamily: Typography.families.bodyMedium, fontSize: 11, color: '#fff' },
  postCaption: { fontFamily: Typography.families.body, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
});
