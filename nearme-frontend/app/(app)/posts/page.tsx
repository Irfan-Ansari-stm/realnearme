'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { postsApi } from '@/lib/api';
import { PageHeader, EmptyState, Pagination, Badge, Button, Skeleton } from '@/components/ui';
import { Camera, Heart, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = ['all', 'pending_moderation', 'approved', 'rejected'];
const statusBadge: Record<string, 'orange' | 'green' | 'red' | 'gray'> = {
  pending_moderation: 'orange', approved: 'green', rejected: 'red', deleted: 'gray',
};

export default function PostsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(
    ['my-posts', page, status],
    () => postsApi.getMyPosts({ page, limit: 12, ...(status !== 'all' && { status }) }),
    { keepPreviousData: true }
  );

  const deleteMut = useMutation(
    { mutationFn: (postId: string) => postsApi.delete(postId), onSuccess: () => { qc.invalidateQueries('my-posts'); toast.success('Post deleted'); }, onError: (_err: unknown) => { toast.error('Failed to delete'); } }
  );

  const posts = data?.data?.data?.posts ?? [];
  const total = data?.data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div>
      <PageHeader title="My Posts" subtitle={`${total} post${total !== 1 ? 's' : ''} shared`} />

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={clsx('px-3 py-1.5 rounded-xl text-sm font-display font-500 transition-all border',
              status === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Camera} title="No posts yet" description="Share photos of your favourite places on their detail pages" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map((post: Record<string, unknown>) => (
              <div key={String(post.id)} className="card group relative overflow-hidden">
                <div className="h-36 bg-surface-200 flex items-center justify-center rounded-xl mb-3">
                  {post.storage_ref != null ? (
                    <img src={`https://storage.googleapis.com/${post.storage_ref}`} alt="" className="w-full h-full object-cover rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Camera className="w-8 h-8 text-surface-500" />
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={statusBadge[String(post.status)] ?? 'gray'}>{String(post.status).replace('_', ' ')}</Badge>
                  <Badge variant="gray">{String(post.category)}</Badge>
                </div>
                {!!post.caption && <p className="text-xs text-surface-600 line-clamp-2 mb-2">{String(post.caption)}</p>}
                <div className="flex items-center justify-between text-xs text-surface-500">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {String(post.like_count || 0)}</span>
                  <span>{formatDistanceToNow(new Date(String(post.created_at)), { addSuffix: true })}</span>
                </div>
                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`/places/${String(post.place_id)}`} className="w-7 h-7 bg-black/50 rounded-lg flex items-center justify-center text-white hover:bg-brand-500 transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => deleteMut.mutate(String(post.id))} className="w-7 h-7 bg-black/50 rounded-lg flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
