import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, CATEGORY_COLOR, CATEGORY_EMOJI, PRICE_LABELS } from '@/theme';
import { RankedPlace } from '@/types';
import { Badge, ScoreBar, RatingStars } from '@/components/ui';
import { safeHaptics } from '@/utils/haptics';
import { Bookmark, BookmarkCheck, MapPin, Star, TrendingUp, Clock } from 'lucide-react-native';

const CARD_W = Dimensions.get('window').width - Spacing[4] * 2;

interface Props {
  place: RankedPlace;
  index: number;
  isSaved: boolean;
  onToggleSave: () => void;
  onPress: () => void;
}

export function PlaceCard({ place, index, isSaved, onToggleSave, onPress }: Props) {
  const catColor = CATEGORY_COLOR[place.category] ?? Colors.surface[600];
  const photoUrl = place.photo_urls?.[0] ?? null;
  const saveScale = useSharedValue(1);

  const handleSave = () => {
    saveScale.value = withSpring(1.3, { damping: 8 }, () => {
      saveScale.value = withSpring(1);
    });
    safeHaptics.impactMedium();
    onToggleSave();
  };

  const saveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const dist = place.distance_km < 1
    ? `${Math.round(place.distance_km * 1000)}m`
    : `${place.distance_km.toFixed(1)}km`;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)}>
      <Pressable
        onPress={() => { safeHaptics.selection(); onPress(); }}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
      >
        {/* Photo */}
        <View style={styles.imageWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderEmoji}>{CATEGORY_EMOJI[place.category] ?? '📍'}</Text>
            </View>
          )}

          {/* Overlay gradient */}
          <View style={styles.imageOverlay} />

          {/* Top badges */}
          <View style={styles.topLeft}>
            <View style={[styles.catBadge, { backgroundColor: catColor }]}>
              <Text style={styles.catText}>{CATEGORY_EMOJI[place.category]} {place.category}</Text>
            </View>
          </View>

          <View style={styles.topRight}>
            {place.open_now !== null && (
              <View style={[styles.statusDot, { backgroundColor: place.open_now ? Colors.success : Colors.error }]}>
                <View style={[styles.statusInner, { backgroundColor: place.open_now ? Colors.success : Colors.error }]} />
                <Text style={styles.statusText}>{place.open_now ? 'Open' : 'Closed'}</Text>
              </View>
            )}
          </View>

          {/* Save button */}
          <Animated.View style={[styles.saveBtn, saveStyle]}>
            <Pressable onPress={handleSave} hitSlop={12}>
              {isSaved
                ? <BookmarkCheck size={20} color={Colors.brand[400]} fill={Colors.brand[400]} />
                : <Bookmark size={20} color="#fff" />
              }
            </Pressable>
          </Animated.View>

          {/* UGC badge */}
          {place.has_ugc_photo && (
            <View style={styles.ugcBadge}>
              <Text style={styles.ugcText}>📸 Community</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
            {place.price_level && (
              <Text style={styles.price}>{PRICE_LABELS[place.price_level]}</Text>
            )}
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color={Colors.surface[600]} />
              <Text style={styles.metaText}>{dist}</Text>
            </View>
            {place.rating && (
              <View style={styles.metaItem}>
                <Star size={12} color={Colors.brand[400]} fill={Colors.brand[400]} />
                <Text style={styles.metaText}>{Number(place.rating).toFixed(1)}</Text>
                <Text style={styles.metaLight}>({place.rating_count})</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Bookmark size={12} color={Colors.surface[600]} />
              <Text style={styles.metaText}>{place.save_count}</Text>
            </View>
          </View>

          {/* Vibes */}
          {place.vibes?.length > 0 && (
            <View style={styles.vibesRow}>
              {place.vibes.slice(0, 3).map((v) => (
                <View key={v} style={styles.vibe}>
                  <Text style={styles.vibeText}>{v.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Score bar */}
          <View style={styles.scoreWrap}>
            <TrendingUp size={11} color={Colors.brand[500]} />
            <View style={{ flex: 1 }}>
              <ScoreBar score={place.score} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface[100],
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.surface[200],
    marginBottom: Spacing[4],
    overflow: 'hidden',
    ...Shadows.md,
  },
  imageWrap: { height: 200, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1, backgroundColor: Colors.surface[150],
    alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholderEmoji: { fontSize: 48 },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topLeft: { position: 'absolute', top: 12, left: 12 },
  topRight: { position: 'absolute', top: 12, right: 48 },
  catBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  catText: { fontFamily: Typography.families.displayMedium, fontSize: 11, color: '#fff' },
  statusDot: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.full, opacity: 0.9,
  },
  statusInner: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Typography.families.displayMedium, fontSize: 10, color: '#fff' },
  saveBtn: {
    position: 'absolute', top: 10, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  ugcBadge: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  ugcText: { fontFamily: Typography.families.bodyMedium, fontSize: 10, color: '#fff' },
  content: { padding: Spacing[4] },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900], flex: 1 },
  price: { fontFamily: Typography.families.displayMedium, fontSize: Typography.sizes.sm, color: Colors.surface[600], marginLeft: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: Typography.families.bodyMedium, fontSize: 12, color: Colors.surface[700] },
  metaLight: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500] },
  vibesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  vibe: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: Colors.surface[200],
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.surface[300],
  },
  vibeText: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[700] },
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
