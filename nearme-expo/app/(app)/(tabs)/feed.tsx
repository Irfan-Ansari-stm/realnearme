import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { feedApi, savesApi } from '@/api';
import { useFeedStore } from '@/store';
import { useLocation, useToast, useRefreshControl } from '@/hooks';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { PlaceCard } from '@/components/feed/PlaceCard';
import { FeedFiltersSheet } from '@/components/feed/FeedFiltersSheet';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { RankedPlace } from '@/types';
import {
  MapPin, SlidersHorizontal, Compass, Zap, RefreshCw,
} from 'lucide-react-native';

export default function FeedScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { lat, lng, loading: locLoading, error: locError, requestLocation } = useLocation();
  const { radiusKm, selectedVibes, selectedCategories, priceRange } = useFeedStore();
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Request location on mount
  useEffect(() => { if (!lat && !lng) requestLocation(); }, []);

  // Fetch feed
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['feed', lat, lng, radiusKm, selectedVibes, selectedCategories, priceRange],
    queryFn: () => feedApi.getFeed({
      lat, lng, radius_km: radiusKm,
      vibes: selectedVibes.join(',') || undefined,
      categories: selectedCategories.join(',') || undefined,
      price_min: priceRange[0], price_max: priceRange[1],
      limit: 30,
    }),
    enabled: !!lat && !!lng,
    staleTime: 60_000,
  });

  const { refreshing, onRefresh } = useRefreshControl(async () => {
    await refetch();
  });

  // Save / unsave
  const saveMut = useMutation({
    mutationFn: async ({ place, saved }: { place: RankedPlace; saved: boolean }) => {
      if (saved) {
        await savesApi.unsave(place.place_id);
      } else {
        await savesApi.save({
          place_id: place.place_id,
          name: place.name,
          category: place.category,
          rating: place.rating ?? undefined,
        });
      }
    },
    onSuccess: (_, { place, saved }) => {
      setSavedIds(prev => {
        const next = new Set(prev);
        if (saved) next.delete(place.place_id); else next.add(place.place_id);
        return next;
      });
      toast.success(saved ? 'Removed from saves' : 'Place saved!');
    },
    onError: () => toast.error('Failed to update save'),
  });

  const places: RankedPlace[] = data?.data?.data?.places ?? [];
  const version = data?.data?.data?.algorithm_version;
  const activeFilters = selectedVibes.length + selectedCategories.length;

  const renderItem = useCallback(({ item, index }: { item: RankedPlace; index: number }) => {
    const saved = savedIds.has(item.place_id);
    return (
      <PlaceCard
        place={item}
        index={index}
        isSaved={saved}
        onToggleSave={() => saveMut.mutate({ place: item, saved })}
        onPress={() => router.push(`/(app)/place/${item.place_id}`)}
      />
    );
  }, [savedIds, saveMut, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          {lat && lng && (
            <Text style={styles.headerSub}>
              Places near you{version ? ` · algo v${version}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowFilters(true)}
            style={[styles.headerBtn, activeFilters > 0 && styles.headerBtnActive]}
          >
            <SlidersHorizontal size={18} color={activeFilters > 0 ? Colors.brand[400] : Colors.surface[700]} />
            {activeFilters > 0 && (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilters}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* No location banner */}
      {!lat && !locLoading && (
        <Animated.View entering={FadeInDown.springify()} style={styles.locationBanner}>
          <MapPin size={20} color={Colors.brand[400]} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>Location needed</Text>
            <Text style={styles.bannerSub}>Enable location to see ranked nearby places</Text>
          </View>
          <Button size="sm" onPress={requestLocation} loading={locLoading}>
            Enable
          </Button>
        </Animated.View>
      )}

      {/* Locating indicator */}
      {locLoading && (
        <View style={styles.locating}>
          <ActivityIndicator size="small" color={Colors.brand[500]} />
          <Text style={styles.locatingText}>Getting your location...</Text>
        </View>
      )}

      {/* Feed list */}
      {isLoading ? (
        <View style={{ padding: Spacing[4] }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ marginBottom: Spacing[4] }}>
              <Skeleton height={200} borderRadius={20} style={{ marginBottom: 8 }} />
              <Skeleton height={20} width="60%" borderRadius={10} style={{ marginBottom: 6 }} />
              <Skeleton height={14} width="40%" borderRadius={8} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => item.place_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.brand[500]}
            />
          }
          ListEmptyComponent={
            lat ? (
              <EmptyState
                icon={<Compass size={32} color={Colors.surface[500]} />}
                title="No places found"
                description="Try expanding your radius or adjusting filters"
                action={{ label: 'Reset filters', onPress: () => useFeedStore.getState().resetFilters() }}
              />
            ) : null
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* Filters sheet */}
      <FeedFiltersSheet visible={showFilters} onClose={() => setShowFilters(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
    borderBottomWidth: 1, borderBottomColor: Colors.surface[150],
  },
  headerTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900] },
  headerSub: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[600], marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200],
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  headerBtnActive: {
    backgroundColor: `${Colors.brand[500]}15`,
    borderColor: `${Colors.brand[500]}40`,
  },
  filterCount: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
  },
  filterCountText: { fontFamily: Typography.families.displayMedium, fontSize: 9, color: '#fff' },
  locationBanner: {
    flexDirection: 'row', alignItems: 'center',
    margin: Spacing[4], padding: Spacing[4],
    backgroundColor: `${Colors.brand[500]}10`,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: `${Colors.brand[500]}30`,
  },
  bannerTitle: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.surface[900] },
  bannerSub: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[600], marginTop: 2 },
  locating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing[4], gap: 10 },
  locatingText: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  list: { padding: Spacing[4] },
});
