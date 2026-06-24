'use client';
import { useState, useEffect, useRef } from 'react';
import { searchApi } from '@/lib/api';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui';
import { Search, Clock, X, MapPin, Camera, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface SearchResult { places: Record<string, unknown>[]; posts: Record<string, unknown>[]; query: string; }
interface HistoryItem { id: string; query: string; searched_at: string; }

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'places' | 'posts'>('places');
  const debouncedQuery = useDebounce(query, 400);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchHistory(); }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) doSearch(debouncedQuery.trim());
    else if (debouncedQuery.trim().length === 0) setResults(null);
  }, [debouncedQuery]);

  const fetchHistory = async () => {
    try { const res = await searchApi.getHistory(); setHistory(res.data.data ?? []); }
    catch {}
  };

  const doSearch = async (q: string) => {
    setLoading(true);
    try { const res = await searchApi.search(q); setResults(res.data.data); }
    catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await searchApi.deleteHistoryItem(id); setHistory((prev) => prev.filter((h) => h.id !== id)); }
    catch {}
  };

  const clearHistory = async () => {
    try { await searchApi.clearHistory(); setHistory([]); toast.success('Search history cleared'); }
    catch {}
  };

  const totalResults = (results?.places.length ?? 0) + (results?.posts.length ?? 0);

  return (
    <div>
      <PageHeader title="Search" subtitle="Find places and posts" />

      {/* Search box */}
      <div className="relative mb-8 max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cafés, parks, hidden gems..."
          className="input pl-12 pr-10 py-4 text-base"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-900">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search history */}
      {!query && history.length > 0 && (
        <div className="mb-8 max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-600 text-surface-900 text-sm">Recent Searches</h3>
            <button onClick={clearHistory} className="text-xs text-surface-500 hover:text-red-400 transition-colors">Clear all</button>
          </div>
          <div className="space-y-1">
            {history.map((item) => (
              <button key={item.id} onClick={() => setQuery(item.query)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-100 transition-colors group text-left">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-surface-500" />
                  <span className="text-sm text-surface-700">{item.query}</span>
                </div>
                <button onClick={(e) => deleteHistoryItem(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-400 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3 max-w-2xl">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <p className="text-surface-600 text-sm">{totalResults} results for <span className="text-brand-400 font-500">"{results.query}"</span></p>
            <div className="flex items-center gap-1 ml-4">
              {(['places', 'posts'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={clsx('px-3 py-1 rounded-lg text-sm font-display font-500 transition-all', activeTab === tab ? 'bg-brand-500 text-white' : 'text-surface-600 hover:text-surface-900')}>
                  {tab === 'places' ? `Places (${results.places.length})` : `Posts (${results.posts.length})`}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'places' && (
            results.places.length === 0
              ? <EmptyState icon={MapPin} title="No places found" description="Try a different search term" />
              : <div className="space-y-2 max-w-2xl">
                  {results.places.map((p) => (
                    <Link key={String(p.id)} href={`/places/${p.place_id}`}
                      className="flex items-center gap-4 p-4 card-hover">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-600 text-surface-900 text-sm truncate">{String(p.title)}</p>
                        <p className="text-surface-500 text-xs truncate">{String(p.subtitle || '')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-orange text-xs">{String(p.category)}</span>
                        {!!p.rating && <span className="text-xs text-surface-500 flex items-center gap-1">⭐ {String(p.rating)}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
          )}

          {activeTab === 'posts' && (
            results.posts.length === 0
              ? <EmptyState icon={Camera} title="No posts found" />
              : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.posts.map((p) => (
                    <div key={String(p.id)} className="card-hover overflow-hidden">
                      <div className="h-36 bg-surface-200 flex items-center justify-center rounded-t-xl">
                        <Camera className="w-8 h-8 text-surface-500" />
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-surface-600 line-clamp-2">{String(p.title || 'No caption')}</p>
                        <p className="text-xs text-surface-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {String(p.like_count || 0)} likes</p>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {totalResults === 0 && (
            <EmptyState icon={Search} title="No results" description={`Nothing found for "${results.query}"`} />
          )}
        </div>
      )}

      {/* Empty state */}
      {!query && history.length === 0 && !loading && (
        <div className="max-w-2xl">
          <EmptyState icon={Search} title="Start searching" description="Find cafés, parks, restaurants and hidden gems around you" />
        </div>
      )}
    </div>
  );
}
