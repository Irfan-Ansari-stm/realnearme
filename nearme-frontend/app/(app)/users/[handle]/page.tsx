'use client';
import { useQuery } from 'react-query';
import { usersApi } from '@/lib/api';
import { PageHeader, Card, Badge, StatCard, Skeleton, EmptyState } from '@/components/ui';
import { User, FileText, Bookmark, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfilePage({ params }: { params: { handle: string } }) {
  const { data, isLoading } = useQuery(
    ['public-profile', params.handle],
    () => usersApi.getProfile(params.handle)
  );

  const user = data?.data?.data;

  if (isLoading) {
    return (
      <div className="max-w-xl">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!user) return <EmptyState icon={User} title="User not found" />;

  return (
    <div className="max-w-xl">
      <PageHeader title="Profile" />

      <Card className="mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            {(user as Record<string, unknown>).photo_url
              ? <img src={String((user as Record<string, unknown>).photo_url)} alt={String((user as Record<string, unknown>).display_name)} className="w-full h-full object-cover" />
              : <span className="font-display font-800 text-3xl text-brand-400">{String((user as Record<string, unknown>).display_name)[0]?.toUpperCase()}</span>
            }
          </div>
          <div>
            <h2 className="font-display font-700 text-2xl text-surface-900">{String((user as Record<string, unknown>).display_name)}</h2>
            <p className="text-surface-500 text-sm">@{String((user as Record<string, unknown>).handle)}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={(user as Record<string, unknown>).role === 'admin' ? 'orange' : (user as Record<string, unknown>).role === 'moderator' ? 'blue' : 'gray'}>
                {String((user as Record<string, unknown>).role)}
              </Badge>
              <span className="text-xs text-surface-500">
                Joined {formatDistanceToNow(new Date(String((user as Record<string, unknown>).created_at)), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Posts" value={Number((user as Record<string, unknown>).stat_posts ?? 0)} icon={FileText} color="orange" />
        <StatCard label="Saves" value={Number((user as Record<string, unknown>).stat_saves ?? 0)} icon={Bookmark} color="blue" />
        <StatCard label="Following" value={Number((user as Record<string, unknown>).stat_following ?? 0)} icon={Users} color="green" />
      </div>
    </div>
  );
}
