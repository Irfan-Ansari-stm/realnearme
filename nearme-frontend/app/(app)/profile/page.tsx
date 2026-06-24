'use client';
import { useQuery, useMutation } from 'react-query';
import { usersApi, sessionsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useForm } from 'react-hook-form';
import { PageHeader, Card, Button, Input, Skeleton, Badge, StatCard, Modal, EmptyState } from '@/components/ui';
import { User, FileText, Bookmark, Cpu, LogOut, AlertTriangle, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const [deletionConfirm, setDeletionConfirm] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { display_name: user?.display_name ?? '', photo_url: user?.photo_url ?? '' } });

  const { data: sessionsData } = useQuery('my-sessions', sessionsApi.getMySessions);
  const sessions = sessionsData?.data?.data ?? [];

  const updateMut = useMutation(
    (data: Record<string, unknown>) => usersApi.updateMe(data),
    {      onSuccess: (res) => { setUser(res.data.data); toast.success('Profile updated!'); },
      onError: (_err: unknown) => { toast.error('Failed to update profile'); },
    }
  );

  const revokeSessionMut = useMutation(
    { mutationFn: (sessionId: string) => sessionsApi.revokeOne(sessionId), onSuccess: () => { toast.success('Session revoked'); } }
  );

  const deletionMut = useMutation(usersApi.deleteMe, {
    onSuccess: (res) => {
      toast.success(`Account deletion scheduled. Deadline: ${new Date(res.data.data.deadline).toLocaleDateString()}`);
      setDeletionConfirm(false);
    },
    onError: (_err: unknown) => { toast.error('Failed to request deletion'); },
  });

  if (!user) return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <PageHeader title="Profile & Settings" subtitle="Manage your account, preferences, and security" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Avatar card */}
          <Card>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center overflow-hidden mb-4">
                {user.photo_url
                  ? <img src={user.photo_url} alt={user.display_name} className="w-full h-full object-cover" />
                  : <span className="font-display font-800 text-4xl text-brand-400">{user.display_name[0]?.toUpperCase()}</span>
                }
              </div>
              <h2 className="font-display font-700 text-xl text-surface-900">{user.display_name}</h2>
              <p className="text-surface-600 text-sm">@{user.handle}</p>
              <Badge variant={user.role === 'admin' ? 'orange' : user.role === 'moderator' ? 'blue' : 'gray'} className="mt-2">{user.role}</Badge>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Posts" value={user.stat_posts} icon={FileText} color="orange" />
            <StatCard label="Saves" value={user.stat_saves} icon={Bookmark} color="blue" />
            <StatCard label="Following" value={user.stat_following} icon={User} color="green" />
          </div>

          {/* Status badges */}
          <Card>
            <h3 className="font-display font-600 text-surface-900 mb-3">Account Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600">Email Verified</span>
                <Badge variant={user.is_verified ? 'green' : 'red'}>{user.is_verified ? '✓ Verified' : 'Not verified'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600">Account Status</span>
                <Badge variant={user.is_active ? 'green' : 'red'}>{user.is_active ? 'Active' : 'Suspended'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600">Onboarding</span>
                <Badge variant={user.onboarding_done ? 'green' : 'gray'}>{user.onboarding_done ? 'Complete' : 'Pending'}</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit profile */}
          <Card>
            <h3 className="font-display font-700 text-surface-900 mb-5">Edit Profile</h3>
            <form onSubmit={handleSubmit((data) => updateMut.mutate(data))} className="space-y-4">
              <Input label="Display Name" {...register('display_name', { required: true, maxLength: 50 })} />
              <Input label="Photo URL" type="url" placeholder="https://..." {...register('photo_url')} />
              <Button type="submit" loading={isSubmitting}>Save Changes</Button>
            </form>
          </Card>

          {/* Preferences */}
          <Card>
            <h3 className="font-display font-700 text-surface-900 mb-4">Preferences</h3>
            {user.preferences && (
              <div className="space-y-3">
                <div>
                  <p className="label">Vibes</p>
                  <div className="flex flex-wrap gap-2">
                    {user.preferences.vibes.length > 0
                      ? user.preferences.vibes.map((v) => <Badge key={v} variant="orange">{v}</Badge>)
                      : <span className="text-sm text-surface-500">None set — update from the Feed filters</span>
                    }
                  </div>
                </div>
                <div>
                  <p className="label">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {user.preferences.categories.length > 0
                      ? user.preferences.categories.map((c) => <Badge key={c} variant="blue">{c}</Badge>)
                      : <span className="text-sm text-surface-500">None set</span>
                    }
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="label">Search Radius</p>
                    <p className="text-surface-900 font-display font-600">{user.preferences.distance_km}km</p>
                  </div>
                  <div>
                    <p className="label">Price Range</p>
                    <p className="text-surface-900 font-display font-600">{'£'.repeat(user.preferences.price_range[1] + 1) || 'Any'}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Sessions */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-700 text-surface-900">Active Sessions</h3>
              <Badge variant="gray">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</Badge>
            </div>
            {sessions.length === 0 ? (
              <EmptyState icon={Cpu} title="No active sessions" />
            ) : (
              <div className="space-y-3">
                {sessions.map((s: Record<string, unknown>) => (
                  <div key={String(s.id)} className="flex items-center justify-between p-3 bg-surface-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-4 h-4 text-surface-500" />
                      <div>
                        <p className="text-sm font-display font-500 text-surface-900">
                          {(s.device_info as Record<string, string>)?.platform || 'Unknown device'}
                        </p>
                        <p className="text-xs text-surface-500">
                          Last active {formatDistanceToNow(new Date(String(s.last_used_at)), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => revokeSessionMut.mutate(String(s.id))} className="text-xs text-red-400 hover:text-red-300 font-display font-500 transition-colors">Revoke</button>
                  </div>
                ))}
                <Button variant="danger" size="sm" onClick={() => sessionsApi.revokeAll().then(() => toast.success('All sessions revoked')).catch(() => toast.error('Failed'))}>
                  Revoke all sessions
                </Button>
              </div>
            )}
          </Card>

          {/* Danger zone */}
          <Card className="border-red-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-red-400" />
              <h3 className="font-display font-700 text-surface-900">Danger Zone</h3>
            </div>
            <p className="text-sm text-surface-600 mb-4">Requesting account deletion initiates a 30-day GDPR Art.17 window. Your data will be permanently removed.</p>
            <Button variant="danger" onClick={() => setDeletionConfirm(true)} icon={<Trash2 className="w-4 h-4" />}>
              Request Account Deletion
            </Button>
          </Card>
        </div>
      </div>

      {/* Deletion confirm modal */}
      <Modal open={deletionConfirm} onClose={() => setDeletionConfirm(false)} title="Confirm Account Deletion" size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-surface-700 text-sm mb-6">This will schedule permanent deletion of your account and all associated data within 30 days. This action cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeletionConfirm(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={() => deletionMut.mutate()} loading={deletionMut.isLoading} className="flex-1">Delete My Account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
