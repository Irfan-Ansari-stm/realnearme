'use client';
import { useMutation, useQueryClient } from 'react-query';
import { postsApi } from '@/lib/api';
import { Modal, Button, Badge } from '@/components/ui';
import { Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const VIBES = ['chill','party','date_night','family','cosy','hidden_gem','lively','scenic'];
const MEDIA_TYPES = ['image', 'video', 'gif'];

interface CreatePostForm {
  caption: string;
  storage_ref: string;
  media_type: string;
  vibes: string[];
}

export function CreatePostModal({ placeId, placeName, placeCategory, onClose }: {
  placeId: string; placeName: string; placeCategory: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<CreatePostForm>({
    defaultValues: { caption: '', storage_ref: '', media_type: 'image', vibes: [] }
  });
  const selectedVibes = watch('vibes') ?? [];

  const createMut = useMutation(
    (data: CreatePostForm) => postsApi.create({
      place_id: placeId,
      caption: data.caption || undefined,
      category: placeCategory,
      vibes: data.vibes,
      storage_ref: data.storage_ref,
      media_type: data.media_type,
      safe_search_scores: {
        adult: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY',
        racy: 'VERY_UNLIKELY', spoof: 'UNLIKELY', medical: 'VERY_UNLIKELY',
      },
    }),
    {
      onSuccess: () => {
        qc.invalidateQueries(['place-posts', placeId]);
        qc.invalidateQueries('my-posts');
        toast.success('Post created! It will appear after moderation.');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create post';
        toast.error(msg);
      },
    }
  );

  const toggleVibe = (vibe: string) => {
    const current = selectedVibes;
    const updated = current.includes(vibe) ? current.filter((v) => v !== vibe) : [...current, vibe].slice(0, 3);
    setValue('vibes', updated);
  };

  return (
    <Modal open={true} onClose={onClose} title={`Add Post — ${placeName}`} size="md">
      <form onSubmit={handleSubmit((data) => createMut.mutate(data))} className="space-y-5">
        {/* Storage ref (Firebase path) */}
        <div>
          <label className="label">Media Storage Path</label>
          <div className="relative">
            <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              className="input pl-10"
              placeholder="users/uid/posts/photo.jpg"
              {...register('storage_ref', { required: 'Storage path is required' })}
            />
          </div>
          <p className="text-xs text-surface-500 mt-1">Firebase Storage path to the uploaded media file</p>
        </div>

        {/* Media type */}
        <div>
          <label className="label">Media Type</label>
          <div className="flex gap-2">
            {MEDIA_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={t} className="accent-brand-500" {...register('media_type')} />
                <span className="text-sm text-surface-700">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="label">Caption (optional)</label>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Tell people what makes this place special..."
            className="input resize-none"
            {...register('caption')}
          />
        </div>

        {/* Vibes */}
        <div>
          <label className="label">Vibes (up to 3)</label>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button key={v} type="button" onClick={() => toggleVibe(v)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-display font-500 transition-all border',
                  selectedVibes.includes(v) ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
                {v.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Info badge */}
        <div className="flex items-center gap-2 p-3 bg-brand-500/5 border border-brand-500/20 rounded-xl">
          <Badge variant="orange">Moderation</Badge>
          <p className="text-xs text-surface-600">Your post will be reviewed before appearing publicly.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onClose} type="button" className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Submit Post</Button>
        </div>
      </form>
    </Modal>
  );
}
