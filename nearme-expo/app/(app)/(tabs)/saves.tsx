import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { savesApi } from '@/api';
import { useToast, useRefreshControl } from '@/hooks';
import { Colors, Typography, Spacing, Radius, CATEGORY_EMOJI, CATEGORY_COLOR, PRICE_LABELS } from '@/theme';
import { EmptyState, Badge, Card, Skeleton, Button } from '@/components/ui';
import { Save } from '@/types';
import { Bookmark, Star, MapPin, Trash2, BarChart2 } from 'lucide-react-native';

const CATEGORIES = ['all','cafe','pub','park','restaurant','art','hidden_gem','beach','other'];

export default function SavesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saves', page, category],
    queryFn: () => savesApi.getMySaves({ page, limit: 20, ...(category !== 'all' && { category }) }),
    placeholderData: keepPreviousData,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['saves-analytics'],
    queryFn: savesApi.getAnalytics,
    enabled: showAnalytics,
  });

  const { refreshing, onRefresh } = useRefreshControl(async () => {
    await refetch();
  });

  const unsaveMut = useMutation({
    mutationFn: (placeId: string) => savesApi.unsave(placeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saves'] }); toast.success('Removed from saves'); },
    onError: () => toast.error('Failed to remove'),
  });

  const saves: Save[] = data?.data?.data?.saves ?? [];
  const total: number = data?.data?.data?.total ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved Places</Text>
          <Text style={styles.subtitle}>{total} place{total !== 1 ? 's' : ''} bookmarked</Text>
        </View>
        <Pressable
          onPress={() => setShowAnalytics(s => !s)}
          style={[styles.headerBtn, showAnalytics && styles.headerBtnActive]}
        >
          <BarChart2 size={18} color={showAnalytics ? Colors.brand[400] : Colors.surface[700]} />
        </Pressable>
      </View>

      {/* Analytics */}
      {showAnalytics && analyticsData?.data?.data && (
        <Animated.View entering={FadeInDown.springify()} style={styles.analyticsWrap}>
          <Text style={styles.analyticsTitle}>Saves by Category</Text>
          {(analyticsData.data.data as Record<string, unknown>[]).map((row: Record<string, unknown>) => (
            <View key={String(row.category)} style={styles.analyticsRow}>
              <Text style={styles.analyticsCat}>{CATEGORY_EMOJI[String(row.category)] ?? '📍'} {String(row.category)}</Text>
              <Text style={styles.analyticsValue}>{String(row.total_saves)} saves</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Category filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={c => c}
        contentContainerStyle={styles.filterList}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: c }) => (
          <Pressable
            onPress={() => { setCategory(c); setPage(1); }}
            style={[styles.filterChip, category === c && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, category === c && styles.filterChipTextActive]}>
              {c === 'all' ? 'All' : `${CATEGORY_EMOJI[c] ?? ''} ${c.replace('_', ' ')}`}
            </Text>
          </Pressable>
        )}
      />

      {/* Saves list */}
      {isLoading ? (
        <View style={{ padding: Spacing[4] }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={72} height={72} borderRadius={Radius.lg} />
              <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
                <Skeleton height={16} width="70%" />
                <Skeleton height={12} width="40%" />
                <Skeleton height={20} width={60} borderRadius={Radius.full} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={saves}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand[500]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Bookmark size={32} color={Colors.surface[500]} />}
              title="No saved places"
              description="Save places from the feed to find them here"
              action={{ label: 'Explore Feed', onPress: () => router.push('/(app)/(tabs)/feed') }}
            />
          }
          renderItem={({ item, index }) => {
            const catColor = CATEGORY_COLOR[item.category] ?? Colors.surface[500];
            return (
              <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
                <Pressable
                  onPress={() => router.push(`/(app)/place/${item.place_id}`)}
                  style={styles.saveItem}
                >
                  {/* Thumb */}
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumbPlaceholder, { backgroundColor: `${catColor}20` }]}>
                      <Text style={{ fontSize: 28 }}>{CATEGORY_EMOJI[item.category] ?? '📍'}</Text>
                    </View>
                  )}

                  {/* Content */}
                  <View style={styles.saveContent}>
                    <Text style={styles.saveName} numberOfLines={1}>{item.name}</Text>
                    <Badge color={catColor}>{item.category}</Badge>
                    <View style={styles.saveMeta}>
                      {item.rating && (
                        <View style={styles.metaItem}>
                          <Star size={12} color={Colors.brand[400]} fill={Colors.brand[400]} />
                          <Text style={styles.metaText}>{Number(item.rating).toFixed(1)}</Text>
                        </View>
                      )}
                      {item.distance_km && (
                        <View style={styles.metaItem}>
                          <MapPin size={12} color={Colors.surface[500]} />
                          <Text style={styles.metaText}>{Number(item.distance_km).toFixed(1)}km</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Unsave */}
                  <Pressable
                    onPress={() => unsaveMut.mutate(item.place_id)}
                    style={styles.unsaveBtn}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={Colors.error} />
                  </Pressable>
                </Pressable>
              </Animated.View>
            );
          }}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3],
  },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900] },
  subtitle: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600], marginTop: 3 },
  headerBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnActive: { backgroundColor: `${Colors.brand[500]}15`, borderColor: `${Colors.brand[500]}40` },
  analyticsWrap: {
    margin: Spacing[4], padding: Spacing[4],
    backgroundColor: Colors.surface[100], borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.surface[200],
  },
  analyticsTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900], marginBottom: Spacing[3] },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.surface[200] },
  analyticsCat: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.surface[700] },
  analyticsValue: { fontFamily: Typography.families.displayMedium, fontSize: Typography.sizes.sm, color: Colors.brand[400] },
  filterList: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[3], gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.surface[150],
    borderWidth: 1, borderColor: Colors.surface[200],
  },
  filterChipActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  filterChipText: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[700] },
  filterChipTextActive: { color: '#fff' },
  list: { padding: Spacing[4] },
  skeletonRow: { flexDirection: 'row', marginBottom: Spacing[3] },
  saveItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface[100], borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.surface[200],
    padding: Spacing[3], marginBottom: Spacing[3],
  },
  thumb: { width: 72, height: 72, borderRadius: Radius.lg },
  thumbPlaceholder: {
    width: 72, height: 72, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  saveContent: { flex: 1, marginLeft: Spacing[3], gap: 6 },
  saveName: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.base, color: Colors.surface[900] },
  saveMeta: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
  unsaveBtn: { padding: 8 },
});
