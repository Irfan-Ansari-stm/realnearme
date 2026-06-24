'use client';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from 'react-query';
import { feedApi, savesApi } from '@/lib/api';
import { useFeedStore, useAuthStore } from '@/store';
import { PageHeader, CardSkeleton, EmptyState, Button, Badge } from '@/components/ui';
import { PlaceCard } from '@/components/feed/PlaceCard';
import { FeedFilters } from '@/components/feed/FeedFilters';
import { Compass, MapPin, Filter, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedPage() {
  const { lat, lng, radiusKm, selectedVibes, selectedCategories, priceRange, setLocation } = useFeedStore();
  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      () => { toast.error('Could not get your location'); setLocating(false); }
    );
  }, [setLocation]);

  useEffect(() => { if (!lat && !lng) getLocation(); }, []);

  const { data, isLoading, refetch, isFetching } = useQuery(
    ['feed', lat, lng, radiusKm, selectedVibes, selectedCategories, priceRange],
    () => feedApi.getFeed({
      lat, lng, radius_km: radiusKm,
      vibes: selectedVibes.join(',') || undefined,
      categories: selectedCategories.join(',') || undefined,
      price_min: priceRange[0], price_max: priceRange[1], limit: 30,
    }),
    { enabled: !!lat && !!lng, staleTime: 60_000 }
  );

  const places = data?.data?.data?.places ?? [];
  const algorithmVersion = data?.data?.data?.algorithm_version;
  const cacheHit = data?.data?.data?.cache_hit;

  const toggleSave = async (place: { place_id: string; name: string; category: string; rating?: number }) => {
    const isSaved = savedPlaces.has(place.place_id);
    try {
      if (isSaved) {
        await savesApi.unsave(place.place_id);
        setSavedPlaces((prev) => { const n = new Set(prev); n.delete(place.place_id); return n; });
        toast.success('Removed from saves');
      } else {
        await savesApi.save({ place_id: place.place_id, name: place.name, category: place.category, rating: place.rating });
        setSavedPlaces((prev) => { const n = new Set(prev); n.add(place.place_id); return n; });
        toast.success('Place saved!');
      }
    } catch { toast.error('Failed to update save'); }
  };

  const activeFilters = selectedVibes.length + selectedCategories.length;

  return (
    <div>
      <PageHeader
        title="Discover"
        subtitle={lat && lng ? `Showing places near you` : 'Enable location to see nearby places'}
        action={
          <div className="flex items-center gap-2">
            {algorithmVersion && (
              <Badge variant="gray">algo v{algorithmVersion}</Badge>
            )}
            {cacheHit !== undefined && (
              <Badge variant={cacheHit ? 'green' : 'blue'}>{cacheHit ? 'cached' : 'live'}</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} icon={<Filter className="w-4 h-4" />}>
              Filters {activeFilters > 0 && `(${activeFilters})`}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} icon={isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Location banner */}
      {!lat && (
        <div className="card p-6 mb-8 flex items-center justify-between border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="font-display font-600 text-surface-900 text-sm">Location required</p>
              <p className="text-surface-600 text-xs">Enable location to see ranked places near you</p>
            </div>
          </div>
          <Button onClick={getLocation} loading={locating} size="sm">
            {locating ? 'Locating...' : 'Enable Location'}
          </Button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && <FeedFilters onClose={() => setShowFilters(false)} />}

      {/* Feed grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : places.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No places found"
          description="Try expanding your radius or adjusting your filters"
          action={{ label: 'Reset filters', onClick: () => useFeedStore.getState().resetFilters() }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {places.map((place: Record<string, unknown>, i: number) => (
            <PlaceCard
              key={String(place.place_id)}
              place={place}
              index={i}
              isSaved={savedPlaces.has(String(place.place_id))}
              onToggleSave={() => toggleSave(place as { place_id: string; name: string; category: string; rating?: number })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
