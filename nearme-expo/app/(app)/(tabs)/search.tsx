import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { searchApi } from '@/api';
import { useDebounce, useToast } from '@/hooks';
import { Colors, Typography, Spacing, Radius, CATEGORY_EMOJI, CATEGORY_COLOR } from '@/theme';
import { EmptyState, Card, Badge } from '@/components/ui';
import { Search, Clock, X, MapPin, Camera, TrendingUp, Trash2 } from 'lucide-react-native';

interface SearchHistory { id: string; query: string; searched_at: string; }
interface SearchResult { places: Record<string, unknown>[]; posts: Record<string, unknown>[]; query: string; }

type Tab = 'places' | 'posts';

export default function SearchScreen() {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('places');
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => { fetchHistory(); }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) doSearch(debouncedQuery.trim());
    else if (!debouncedQuery.trim()) setResults(null);
  }, [debouncedQuery]);

  const fetchHistory = async () => {
    try {
      const res = await searchApi.getHistory();
      setHistory(res.data.data ?? []);
    } catch {}
  };

  const doSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await searchApi.search(q);
      setResults(res.data.data);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await searchApi.deleteHistoryItem(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch {}
  };

  const clearHistory = async () => {
    try {
      await searchApi.clearHistory();
      setHistory([]);
      toast.success('Search history cleared');
    } catch {}
  };

  const selectHistory = (q: string) => { setQuery(q); inputRef.current?.focus(); };

  const totalResults = (results?.places.length ?? 0) + (results?.posts.length ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.surface[500]} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search places, cafés, parks..."
          placeholderTextColor={Colors.surface[500]}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => query.trim().length >= 2 && doSearch(query.trim())}
        />
        {loading && <ActivityIndicator size="small" color={Colors.brand[500]} style={{ marginRight: 12 }} />}
        {!!query && !loading && (
          <Pressable onPress={() => { setQuery(''); setResults(null); }} hitSlop={10} style={{ marginRight: 12 }}>
            <X size={16} color={Colors.surface[500]} />
          </Pressable>
        )}
      </View>

      {/* Results */}
      {results && (
        <View style={{ flex: 1 }}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <Text style={styles.resultCount}>{totalResults} results for <Text style={styles.queryText}>"{results.query}"</Text></Text>
            <View style={styles.tabBtns}>
              {(['places', 'posts'] as Tab[]).map((t) => (
                <Pressable key={t} onPress={() => setActiveTab(t)}
                  style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}>
                  <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
                    {t === 'places' ? `Places (${results.places.length})` : `Posts (${results.posts.length})`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {activeTab === 'places' && (
            <FlatList
              data={results.places}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ padding: Spacing[4] }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EmptyState icon={<MapPin size={28} color={Colors.surface[500]} />} title="No places found" />}
              renderItem={({ item }) => {
                const cat = String(item.category ?? 'other');
                const color = CATEGORY_COLOR[cat] ?? Colors.surface[500];
                return (
                  <Pressable
                    onPress={() => router.push(`/(app)/place/${item.place_id}`)}
                    style={styles.resultItem}
                  >
                    <View style={[styles.resultIcon, { backgroundColor: `${color}20` }]}>
                      <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJI[cat] ?? '📍'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{String(item.title ?? item.name ?? '')}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{String(item.subtitle ?? item.formatted_address ?? '')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge color={color}>{cat}</Badge>
                      {Boolean(item.rating) && <Text style={styles.rating}>⭐ {String(item.rating)}</Text>}
                    </View>
                  </Pressable>
                );
              }}
              ListFooterComponent={<View style={{ height: 100 }} />}
            />
          )}

          {activeTab === 'posts' && (
            <FlatList
              data={results.posts}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ padding: Spacing[4] }}
              numColumns={2}
              columnWrapperStyle={{ gap: Spacing[3] }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EmptyState icon={<Camera size={28} color={Colors.surface[500]} />} title="No posts found" />}
              renderItem={({ item }) => (
                <View style={styles.postGrid}>
                  <View style={styles.postThumb}>
                    <Camera size={24} color={Colors.surface[500]} />
                  </View>
                  <Text style={styles.postCaption} numberOfLines={2}>{String(item.title ?? item.caption ?? 'No caption')}</Text>
                  <Text style={styles.postLikes}>❤️ {String(item.like_count ?? 0)}</Text>
                </View>
              )}
              ListFooterComponent={<View style={{ height: 100 }} />}
            />
          )}
        </View>
      )}

      {/* History */}
      {!query && !results && (
        <View style={{ flex: 1, padding: Spacing[4] }}>
          {history.length > 0 && (
            <>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent Searches</Text>
                <Pressable onPress={clearHistory}>
                  <Text style={styles.clearAll}>Clear all</Text>
                </Pressable>
              </View>
              {history.map((item) => (
                <Animated.View key={item.id} entering={FadeInDown.springify()}>
                  <Pressable style={styles.historyItem} onPress={() => selectHistory(item.query)}>
                    <Clock size={15} color={Colors.surface[500]} />
                    <Text style={styles.historyText}>{item.query}</Text>
                    <Pressable onPress={() => deleteHistoryItem(item.id)} hitSlop={10} style={{ marginLeft: 'auto' }}>
                      <X size={14} color={Colors.surface[400]} />
                    </Pressable>
                  </Pressable>
                </Animated.View>
              ))}
            </>
          )}

          {history.length === 0 && (
            <EmptyState
              icon={<Search size={32} color={Colors.surface[500]} />}
              title="Start searching"
              description="Find cafés, parks, restaurants and hidden gems near you"
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface[0] },
  header: { paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[2] },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900] },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface[100], borderWidth: 1, borderColor: Colors.surface[200],
    borderRadius: Radius.xl, marginHorizontal: Spacing[4], marginBottom: Spacing[2],
  },
  searchIcon: { marginLeft: 14, marginRight: 4 },
  searchInput: {
    flex: 1, height: 52,
    fontFamily: Typography.families.body, fontSize: Typography.sizes.base,
    color: Colors.surface[900], paddingHorizontal: Spacing[3],
  },
  tabs: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] },
  resultCount: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600], marginBottom: 10 },
  queryText: { color: Colors.brand[400], fontFamily: Typography.families.bodySemiBold },
  tabBtns: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.surface[150],
    borderWidth: 1, borderColor: Colors.surface[200],
  },
  tabBtnActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  tabBtnText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  tabBtnTextActive: { color: '#fff' },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: Spacing[4], backgroundColor: Colors.surface[100],
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surface[200],
    marginBottom: Spacing[2],
  },
  resultIcon: {
    width: 44, height: 44, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  resultName: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.base, color: Colors.surface[900] },
  resultSub: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600], marginTop: 2 },
  rating: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[600] },
  postGrid: { flex: 1, backgroundColor: Colors.surface[100], borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surface[200], padding: 12 },
  postThumb: {
    height: 100, backgroundColor: Colors.surface[200], borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  postCaption: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[700], lineHeight: 15 },
  postLikes: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500], marginTop: 4 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[3] },
  historyTitle: { fontFamily: Typography.families.display, fontSize: Typography.sizes.md, color: Colors.surface[900] },
  clearAll: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.error },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: Spacing[3], paddingHorizontal: Spacing[4],
    backgroundColor: Colors.surface[100], borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surface[200], marginBottom: Spacing[2],
  },
  historyText: { fontFamily: Typography.families.body, fontSize: Typography.sizes.base, color: Colors.surface[800], flex: 1 },
});
