'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { placesApi } from '@/lib/api';
import { PageHeader, Table, Badge, Button, Modal, Input, Select, Pagination, Skeleton } from '@/components/ui';
import { MapPin, Plus, Star, Bookmark, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_OPTIONS = [
  { value: 'cafe', label: 'Café' }, { value: 'pub', label: 'Pub' }, { value: 'park', label: 'Park' },
  { value: 'restaurant', label: 'Restaurant' }, { value: 'art', label: 'Art' },
  { value: 'hidden_gem', label: 'Hidden Gem' }, { value: 'beach', label: 'Beach' }, { value: 'other', label: 'Other' },
];

export default function AdminPlacesPage() {
  const [page, setPage] = useState(1);
  const [catFilter, setCatFilter] = useState('');
  const [showUpsert, setShowUpsert] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(
    ['admin-places', page, catFilter],
    () => placesApi.adminList({ page, limit: 20, ...(catFilter && { category: catFilter }) }),
    { keepPreviousData: true }
  );

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { place_id: '', name: '', category: 'cafe', lat: '', lng: '', formatted_address: '', phone: '', website: '', rating: '', rating_count: 0, price_level: '2', open_now: true }
  });

  const upsertMut = useMutation(
    (data: Record<string, unknown>) => placesApi.upsert({ ...data, lat: Number(data.lat), lng: Number(data.lng), rating: data.rating ? Number(data.rating) : undefined }),
    {      onSuccess: () => { qc.invalidateQueries('admin-places'); toast.success('Place saved to cache'); setShowUpsert(false); reset(); },
      onError: (_err: unknown) => { toast.error('Failed to upsert place'); },
    }
  );

  const featureMut = useMutation(
    (placeId: string) => placesApi.feature(placeId),
    {      onSuccess: () => { toast.success('Place featured in audit log'); }, onError: (_err: unknown) => { toast.error('Failed'); }
    }
  );

  const places = data?.data?.data?.places ?? [];
  const total = data?.data?.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Places Cache"
        subtitle={`${total} places in cache`}
        action={<Button size="sm" onClick={() => setShowUpsert(true)} icon={<Plus className="w-4 h-4" />}>Add Place</Button>}
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[{ value: '', label: 'All' }, ...CATEGORY_OPTIONS].map((c) => (
          <button key={c.value} onClick={() => { setCatFilter(c.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-display font-500 transition-all border ${catFilter === c.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <Table headers={['Name', 'Category', 'Rating', 'Saves', 'UGC', 'Expires', 'Actions']} loading={isLoading}>
        {places.map((p: Record<string, unknown>) => (
          <tr key={String(p.place_id)} className="hover:bg-surface-100/50 transition-colors">
            <td className="px-4 py-3">
              <p className="font-display font-500 text-surface-900 text-sm">{String(p.name)}</p>
              <p className="text-xs text-surface-500 font-mono">{String(p.place_id).slice(0, 20)}...</p>
            </td>
            <td className="px-4 py-3"><Badge variant="orange">{String(p.category)}</Badge></td>
            <td className="px-4 py-3">
              {p.rating ? <span className="flex items-center gap-1 text-sm text-surface-700"><Star className="w-3 h-3 text-brand-400" />{String(p.rating)}</span> : <span className="text-surface-500 text-sm">—</span>}
            </td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-1 text-sm text-surface-700"><Bookmark className="w-3 h-3" />{String(p.save_count)}</span>
            </td>
            <td className="px-4 py-3">
              <Badge variant={p.has_ugc_photo ? 'green' : 'gray'}>{p.has_ugc_photo ? '✓' : '—'}</Badge>
            </td>
            <td className="px-4 py-3 text-xs text-surface-500">
              {formatDistanceToNow(new Date(String(p.expires_at)), { addSuffix: true })}
            </td>
            <td className="px-4 py-3">
              <button onClick={() => featureMut.mutate(String(p.place_id))} title="Feature place"
                className="text-xs text-brand-400 hover:text-brand-300 font-display font-500 transition-colors">
                Feature
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPage={setPage} />

      {/* Upsert Modal */}
      <Modal open={showUpsert} onClose={() => setShowUpsert(false)} title="Add / Update Place" size="lg">
        <form onSubmit={handleSubmit((data) => upsertMut.mutate(data as Record<string, unknown>))} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Google Place ID" placeholder="ChIJ..." {...register('place_id', { required: true })} /></div>
          <div className="col-span-2"><Input label="Name" placeholder="The Cosy Corner Café" {...register('name', { required: true })} /></div>
          <Select label="Category" options={CATEGORY_OPTIONS} {...register('category')} />
          <Select label="Price Level" options={[{ value: '0', label: 'Free' }, { value: '1', label: '£' }, { value: '2', label: '££' }, { value: '3', label: '£££' }, { value: '4', label: '££££' }]} {...register('price_level')} />
          <Input label="Latitude" type="number" step="any" placeholder="51.5074" {...register('lat', { required: true })} />
          <Input label="Longitude" type="number" step="any" placeholder="-0.1278" {...register('lng', { required: true })} />
          <div className="col-span-2"><Input label="Address" placeholder="12 Baker Street, London" {...register('formatted_address')} /></div>
          <Input label="Phone" placeholder="+44 20 7946 0958" {...register('phone')} />
          <Input label="Website" type="url" placeholder="https://..." {...register('website')} />
          <Input label="Rating (0-5)" type="number" step="0.1" min="0" max="5" {...register('rating')} />
          <Input label="Review Count" type="number" {...register('rating_count', { valueAsNumber: true })} />
          <div className="col-span-2 flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowUpsert(false)} className="flex-1" type="button">Cancel</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">Save Place</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
