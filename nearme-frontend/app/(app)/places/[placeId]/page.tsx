'use client';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { placesApi, savesApi, postsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { PageHeader, Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { MapPin, Star, Bookmark, BookmarkCheck, Phone, Globe, Clock, Camera, Heart, Flag } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ReportModal } from '@/components/reports/ReportModal';
import { CreatePostModal } from '@/components/posts/CreatePostModal';
import clsx from 'clsx';

const priceLabels: Record<string, string> = { '0': 'Free', '1': '£', '2': '££', '3': '£££', '4': '££££' };

export default function PlacePage({ params }: { params: { placeId: string } }) {
  const { placeId } = params;
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postsPage, setPostsPage] = useState(1);

  const { data: placeData, isLoading: placeLoading } = useQuery(['place', placeId], () => placesApi.getById(placeId));
  const { data: detailData } = useQuery(['place-detail', placeId], () => placesApi.getDetail(placeId), { retry: false });
  const { data: saveCheckData, refetch: refetchSave } = useQuery(['save-check', placeId], () => savesApi.checkSaved(placeId));
  const { data: saveCountData, refetch: refetchCount } = useQuery(['save-count', placeId], () => savesApi.getSaveCount(placeId));
  const { data: postsData, isLoading: postsLoading } = useQuery(
    ['place-posts', placeId, postsPage],
    () => postsApi.getForPlace(placeId, { page: postsPage, limit: 12 })
  );

  const place = placeData?.data?.data;
  const detail = detailData?.data?.data;
  const isSaved = saveCheckData?.data?.data?.is_saved ?? false;
  const saveCount = saveCountData?.data?.data?.save_count ?? 0;
  const posts = postsData?.data?.data?.posts ?? [];

  const saveMut = useMutation(
    () => isSaved ? savesApi.unsave(placeId) : savesApi.save({ place_id: placeId, name: place?.name, category: place?.category, rating: place?.rating }),
    {
      onSuccess: () => {
        refetchSave(); refetchCount();
        toast.success(isSaved ? 'Removed from saves' : 'Place saved!');
      },
      onError: (_err: unknown) => { toast.error('Failed to update save'); },
    }
  );

  const likeMut = useMutation(
    { mutationFn: (postId: string) => postsApi.like(postId), onSuccess: () => { qc.invalidateQueries(['place-posts', placeId]); toast.success('Liked!'); } }
  );

  if (placeLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-64 w-full mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!place) return <EmptyState icon={MapPin} title="Place not found" />;

  return (
    <div>
      <PageHeader
        title={place.name}
        subtitle={place.formatted_address}
        action={
          <Button
            onClick={() => saveMut.mutate()}
            loading={saveMut.isLoading}
            variant={isSaved ? 'ghost' : 'primary'}
            icon={isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          >
            {isSaved ? 'Saved' : 'Save Place'}
          </Button>
        }
      />

      {/* Photo */}
      {place.photo_urls?.length > 0 && (
        <div className="h-72 rounded-2xl overflow-hidden mb-8 bg-surface-200">
          <img src={place.photo_urls[0]} alt={place.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Main info */}
        <Card className="md:col-span-2">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge variant="orange">{place.category}</Badge>
            {place.vibes?.map((v: string) => <Badge key={v} variant="gray">{v}</Badge>)}
            {!!place.price_level && <Badge variant="gray">{priceLabels[place.price_level]}</Badge>}
            {detail?.open_now !== null && (
              <Badge variant={detail?.open_now ? 'green' : 'red'}>
                {detail?.open_now ? '● Open now' : '● Closed'}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-brand-400" />
                <span className="font-display font-700 text-lg text-surface-900">{place.rating ?? '—'}</span>
              </div>
              <p className="text-xs text-surface-500">{place.rating_count} reviews</p>
            </div>
            <div className="card p-4 text-center">
              <p className="font-display font-700 text-lg text-surface-900">{saveCount}</p>
              <p className="text-xs text-surface-500">saves</p>
            </div>
            <div className="card p-4 text-center">
              <p className="font-display font-700 text-lg text-surface-900">{posts.length}</p>
              <p className="text-xs text-surface-500">posts</p>
            </div>
            <div className="card p-4 text-center">
              <p className="font-display font-700 text-lg text-surface-900">{place.like_count ?? 0}</p>
              <p className="text-xs text-surface-500">likes</p>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card>
          <h3 className="font-display font-600 text-surface-900 mb-4">Details</h3>
          <div className="space-y-3">
            {(detail?.phone || place.phone) && (
              <a href={`tel:${detail?.phone || place.phone}`} className="flex items-center gap-2 text-sm text-surface-600 hover:text-brand-400 transition-colors">
                <Phone className="w-4 h-4 flex-shrink-0" />
                {detail?.phone || place.phone}
              </a>
            )}
            {(detail?.website || place.website) && (
              <a href={detail?.website || place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-surface-600 hover:text-brand-400 transition-colors">
                <Globe className="w-4 h-4 flex-shrink-0" />
                Visit website
              </a>
            )}
            {detail?.opening_hours?.weekday_text && (
              <div>
                <div className="flex items-center gap-2 text-sm text-surface-600 mb-2">
                  <Clock className="w-4 h-4" /> Opening hours
                </div>
                <div className="space-y-1 pl-6">
                  {detail.opening_hours.weekday_text.map((t: string, i: number) => (
                    <p key={i} className="text-xs text-surface-500">{t}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Posts section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">Community Posts</h2>
        {user && (
          <Button onClick={() => setShowCreatePost(true)} size="sm" icon={<Camera className="w-4 h-4" />}>
            Add Post
          </Button>
        )}
      </div>

      {postsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Camera} title="No posts yet" description="Be the first to share this place!"
          action={user ? { label: 'Add a post', onClick: () => setShowCreatePost(true) } : undefined} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post: Record<string, unknown>) => (
            <div key={String(post.id)} className="group relative bg-surface-100 rounded-2xl overflow-hidden aspect-square">
              {post.storage_ref != null ? (
                <img src={`https://storage.googleapis.com/${post.storage_ref}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-surface-500" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex flex-col justify-end">
                <p className="text-white text-xs line-clamp-2">{String(post.caption || '')}</p>
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => likeMut.mutate(String(post.id))} className="flex items-center gap-1 text-white text-xs">
                    <Heart className="w-3.5 h-3.5" /> {String(post.like_count || 0)}
                  </button>
                  <button onClick={() => setReportPostId(String(post.id))} className="text-white/70 hover:text-red-400 transition-colors">
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reportPostId && <ReportModal postId={reportPostId} onClose={() => setReportPostId(null)} />}
      {showCreatePost && <CreatePostModal placeId={placeId} placeName={place.name} placeCategory={place.category} onClose={() => setShowCreatePost(false)} />}
    </div>
  );
}
