'use client';
import { useState } from 'react';
import { useMutation } from 'react-query';
import { reportsApi } from '@/lib/api';
import { Modal, Button } from '@/components/ui';
import { Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const REASONS = [
  { value: 'inappropriate', label: '🚫 Inappropriate content' },
  { value: 'spam', label: '📢 Spam' },
  { value: 'violence', label: '⚠️ Violence' },
  { value: 'copyright', label: '©️ Copyright violation' },
  { value: 'other', label: '❓ Other' },
];

export function ReportModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const reportMut = useMutation(
    () => reportsApi.submit({ post_id: postId, reason, description: description || undefined }),
    {
      onSuccess: () => { toast.success('Report submitted. Our team will review it.'); onClose(); },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit report';
        toast.error(msg);
      },
    }
  );

  return (
    <Modal open={true} onClose={onClose} title="Report Content" size="sm">
      <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl mb-5">
        <Flag className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-xs text-surface-600">Reports are reviewed by our moderation team. False reports may result in account suspension.</p>
      </div>

      <div className="space-y-2 mb-5">
        {REASONS.map((r) => (
          <button key={r.value} onClick={() => setReason(r.value)}
            className={clsx('w-full text-left px-4 py-3 rounded-xl text-sm transition-all border font-body',
              reason === r.value ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' : 'bg-surface-100 border-surface-200 text-surface-700 hover:border-brand-500/20')}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="label">Additional details (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Describe the issue..."
          className="input resize-none"
        />
        <p className="text-xs text-surface-500 mt-1 text-right">{description.length}/500</p>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button
          variant="danger"
          onClick={() => reportMut.mutate()}
          loading={reportMut.isLoading}
          disabled={!reason}
          className="flex-1"
        >
          Submit Report
        </Button>
      </div>
    </Modal>
  );
}
