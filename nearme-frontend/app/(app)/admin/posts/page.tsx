'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { postsApi } from '@/lib/api';
import { PageHeader, Table, Badge, Button, Pagination, Modal } from '@/components/ui';
import { FileText, Check, X, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const statusBadge: Record<string, 'orange' | 'green' | 'red' | 'gray'> = {
  pending_moderation: 'orange', approved: 'green', rejected: 'red', deleted: 'gray',
};

export default function AdminPostsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(
    ['admin-posts', page, statusFilter],
    () => postsApi.adminList({ page, limit: 20, ...(statusFilter && { status: statusFilter }) }),
    { keepPreviousData: true }
  );

  const moderateMut = useMutation(
    ({ postId, action }: { postId: string; action: 'approve' | 'reject' }) =>
      postsApi.moderate(postId, { action }),
    { onSuccess: (_, { action }) => { qc.invalidateQueries('admin-posts'); toast.success(`Post ${action}d`); }, onError: (_err: unknown) => { toast.error('Failed'); } }
  );

  const deleteMut = useMutation(
    { mutationFn: (postId: string) => postsApi.delete(postId), onSuccess: () => { qc.invalidateQueries('admin-posts'); toast.success('Post deleted'); setConfirmDelete(null); }, onError: (_err: unknown) => { toast.error('Failed to delete'); } }
  );

  const posts = data?.data?.data?.posts ?? [];
  const total = data?.data?.data?.total ?? 0;

  return (
    <div>
      <PageHeader title="Posts Management" subtitle={`${total} total posts`} />

      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'pending_moderation', 'approved', 'rejected', 'deleted'].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-display font-500 transition-all border ${statusFilter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <Table headers={['Post', 'Author', 'Category', 'Status', 'Reports', 'Likes', 'Created', 'Actions']} loading={isLoading}>
        {posts.map((p: Record<string, unknown>) => (
          <tr key={String(p.id)} className="hover:bg-surface-100/50 transition-colors">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-surface-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-surface-500" />
                </div>
                <p className="text-xs text-surface-600 max-w-32 line-clamp-2">{String(p.caption || 'No caption')}</p>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-surface-700">@{String(p.author_handle || '—')}</td>
            <td className="px-4 py-3"><Badge variant="orange">{String(p.category)}</Badge></td>
            <td className="px-4 py-3"><Badge variant={statusBadge[String(p.status)] ?? 'gray'}>{String(p.status).replace('_', ' ')}</Badge></td>
            <td className="px-4 py-3">
              <span className={Number(p.report_count) >= 3 ? 'text-red-400 font-600' : 'text-surface-600'}>
                {String(p.report_count || 0)}
              </span>
            </td>
            <td className="px-4 py-3 text-sm text-surface-600">{String(p.like_count || 0)}</td>
            <td className="px-4 py-3 text-xs text-surface-500">{formatDistanceToNow(new Date(String(p.created_at)), { addSuffix: true })}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <Link href={`/places/${p.place_id}`} className="w-7 h-7 flex items-center justify-center text-surface-500 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors" title="View place">
                  <Eye className="w-3.5 h-3.5" />
                </Link>
                {p.status === 'pending_moderation' && <>
                  <button onClick={() => moderateMut.mutate({ postId: String(p.id), action: 'approve' })} className="w-7 h-7 flex items-center justify-center text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Approve">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moderateMut.mutate({ postId: String(p.id), action: 'reject' })} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Reject">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>}
                {p.status !== 'deleted' && (
                  <button onClick={() => setConfirmDelete(String(p.id))} className="w-7 h-7 flex items-center justify-center text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPage={setPage} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Post?" size="sm">
        <p className="text-sm text-surface-600 mb-6">This will soft-delete the post and remove its content. The tombstone is retained for 90 days.</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteMut.mutate(confirmDelete!)} loading={deleteMut.isLoading} className="flex-1">Delete Post</Button>
        </div>
      </Modal>
    </div>
  );
}
