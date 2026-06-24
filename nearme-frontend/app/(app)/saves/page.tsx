'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { savesApi } from '@/lib/api';
import { PageHeader, EmptyState, Pagination, Badge, Button, Skeleton } from '@/components/ui';
import { Bookmark, Star, MapPin, X, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CATEGORIES = ['all','cafe','pub','park','restaurant','art','hidden_gem','beach','other'];

export default function SavesPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(
    ['saves', page, category],
    () => savesApi.getMySaves({ page, limit: 20, ...(category !== 'all' && { category }) }),
    { keepPreviousData: true }
  );

  const { data: analyticsData } = useQuery('saves-analytics', savesApi.getAnalytics, { enabled: showAnalytics });

  const unsaveMut = useMutation(
    (placeId: string) => savesApi.unsave(placeId),
    {      onSuccess: () => { qc.invalidateQueries('saves'); toast.success('Removed from saves'); },
      onError: (_err: unknown) => { toast.error('Failed to remove save'); },
    }
  );

  const saves = data?.data?.data?.saves ?? [];
  const total = data?.data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <PageHeader
        title="Saved Places"
        subtitle={`${total} place${total !== 1 ? 's' : ''} bookmarked`}
        action={
          <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(!showAnalytics)} icon={<BarChart2 className="w-4 h-4" />}>
            Analytics
          </Button>
        }
      />

      {/* Analytics */}
      {showAnalytics && analyticsData?.data?.data && (
        <div className="card p-6 mb-6 animate-fade-up">
          <h3 className="font-display font-700 text-surface-900 mb-4">Saves Analytics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-surface-200">
                {['Category','Total Saves','Unique Users','Unique Places'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-display font-500 text-surface-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-surface-200">
                {analyticsData.data.data.map((row: Record<string, unknown>) => (
                  <tr key={String(row.category)}>
                    <td className="px-3 py-3"><Badge variant="orange">{String(row.category)}</Badge></td>
                    <td className="px-3 py-3 font-mono text-surface-900">{String(row.total_saves)}</td>
                    <td className="px-3 py-3 font-mono text-surface-900">{String(row.unique_users)}</td>
                    <td className="px-3 py-3 font-mono text-surface-900">{String(row.unique_places)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => { setCategory(c); setPage(1); }}
            className={clsx('px-3 py-1.5 rounded-xl text-sm font-display font-500 transition-all border',
              category === c ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
            {c === 'all' ? 'All' : c.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Saves list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : saves.length === 0 ? (
        <EmptyState icon={Bookmark} title="No saved places" description="Save places from the feed to find them here later"
          action={{ label: 'Explore feed', onClick: () => window.location.href = '/feed' }} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {saves.map((save: Record<string, unknown>) => (
              <div key={String(save.id)} className="card-hover flex gap-4 p-4 group relative">
                {save.photo_url != null ? (
                  <img src={String(save.photo_url)} alt={String(save.name)} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-surface-200 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-surface-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/places/${String(save.place_id)}`}>
                    <h3 className="font-display font-600 text-surface-900 text-sm mb-1 hover:text-brand-400 transition-colors truncate">{String(save.name)}</h3>
                  </Link>
                  <Badge variant="orange">{String(save.category)}</Badge>
                  {!!save.rating && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-surface-500">
                      <Star className="w-3 h-3 text-brand-400" /> {String(save.rating)}
                    </div>
                  )}
                  {!!save.distance_km && (
                    <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{Number(save.distance_km).toFixed(1)}km (at time of save)
                    </p>
                  )}
                </div>
                <button
                  onClick={() => unsaveMut.mutate(String(save.place_id))}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-surface-500 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
