import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Colors, Typography, Spacing, Radius, VIBES, CATEGORIES, VIBE_EMOJI, CATEGORY_EMOJI, CATEGORY_COLOR } from '@/theme';
import { useFeedStore } from '@/store';
import { SheetModal, Button, Chip, Divider } from '@/components/ui';
import { RotateCcw } from 'lucide-react-native';

const RADII = [1, 2, 5, 10, 20, 50];
const PRICES = [
  { label: 'Free', value: 0 },
  { label: '£', value: 1 },
  { label: '££', value: 2 },
  { label: '£££', value: 3 },
  { label: '££££', value: 4 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FeedFiltersSheet({ visible, onClose }: Props) {
  const {
    radiusKm, selectedVibes, selectedCategories, priceRange,
    setRadius, toggleVibe, toggleCategory, setPriceRange, resetFilters,
  } = useFeedStore();

  const activeCount = selectedVibes.length + selectedCategories.length;

  return (
    <SheetModal visible={visible} onClose={onClose} title="Filter Places">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Radius */}
        <Text style={styles.sectionLabel}>Search Radius</Text>
        <View style={styles.chipRow}>
          {RADII.map((r) => (
            <Chip
              key={r}
              label={`${r}km`}
              selected={radiusKm === r}
              onPress={() => setRadius(r)}
              color={Colors.brand[500]}
            />
          ))}
        </View>

        <Divider />

        {/* Price */}
        <Text style={styles.sectionLabel}>Max Price</Text>
        <View style={styles.chipRow}>
          {PRICES.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              selected={priceRange[1] >= p.value}
              onPress={() => setPriceRange([0, p.value])}
              color={Colors.brand[500]}
            />
          ))}
        </View>

        <Divider />

        {/* Vibes */}
        <Text style={styles.sectionLabel}>Vibes</Text>
        <View style={styles.chipRow}>
          {VIBES.map((v) => (
            <Chip
              key={v}
              label={`${VIBE_EMOJI[v]} ${v.replace('_', ' ')}`}
              selected={selectedVibes.includes(v)}
              onPress={() => toggleVibe(v)}
              color={Colors.brand[500]}
            />
          ))}
        </View>

        <Divider />

        {/* Categories */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={`${CATEGORY_EMOJI[c]} ${c.replace('_', ' ')}`}
              selected={selectedCategories.includes(c)}
              onPress={() => toggleCategory(c)}
              color={CATEGORY_COLOR[c]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              onPress={resetFilters}
              icon={<RotateCcw size={15} color={Colors.surface[600]} />}
              style={{ flex: 1, marginRight: 8 }}
            >
              Reset ({activeCount})
            </Button>
          )}
          <Button onPress={onClose} style={{ flex: 1 }} fullWidth>
            Apply Filters
          </Button>
        </View>
      </ScrollView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing[6] },
  sectionLabel: {
    fontFamily: Typography.families.displayMedium,
    fontSize: Typography.sizes.xs,
    color: Colors.surface[600],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing[3],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  actions: { flexDirection: 'row', marginTop: Spacing[6] },
});
