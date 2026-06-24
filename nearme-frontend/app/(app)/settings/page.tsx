'use client';
import { useState } from 'react';
import { useMutation } from 'react-query';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { PageHeader, Card, Button, Toggle } from '@/components/ui';
import { Bell, Shield, Globe, Palette, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const [notifLike, setNotifLike] = useState(true);
  const [notifNearby, setNotifNearby] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(user?.onboarding_done ?? false);

  const updateMut = useMutation(
    { mutationFn: (data: Record<string, unknown>) => usersApi.updateMe(data), onSuccess: (res) => { setUser(res.data.data); toast.success('Settings saved'); }, onError: (_err: unknown) => { toast.error('Failed to save'); } }
  );

  const handleOnboardingToggle = (val: boolean) => {
    setOnboardingDone(val);
    updateMut.mutate({ onboarding_done: val });
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Application preferences and account settings" />

      <div className="max-w-2xl space-y-6">
        {/* Notifications */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-brand-500/10 rounded-xl flex items-center justify-center">
              <Bell className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="font-display font-700 text-surface-900">Notifications</h3>
              <p className="text-xs text-surface-600">Control what notifications you receive</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-display font-500 text-surface-900">Likes on your posts</p>
                <p className="text-xs text-surface-600">Get notified when someone likes your post</p>
              </div>
              <Toggle checked={notifLike} onChange={setNotifLike} />
            </div>
            <div className="divider" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-display font-500 text-surface-900">New nearby places</p>
                <p className="text-xs text-surface-600">Discover new spots added in your area</p>
              </div>
              <Toggle checked={notifNearby} onChange={setNotifNearby} />
            </div>
            <div className="divider" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-display font-500 text-surface-900">System notifications</p>
                <p className="text-xs text-surface-600">Important account and platform updates</p>
              </div>
              <Toggle checked={notifSystem} onChange={setNotifSystem} />
            </div>
          </div>
        </Card>

        {/* Privacy */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-display font-700 text-surface-900">Privacy & Data</h3>
              <p className="text-xs text-surface-600">GDPR-compliant data controls</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-surface-100 rounded-xl">
              <p className="text-sm font-display font-600 text-surface-900 mb-1">Location Data</p>
              <p className="text-xs text-surface-600 leading-relaxed">Your GPS coordinates are never stored. They are used only ephemerally within each feed request to calculate distances, then discarded immediately. This is enforced at the database layer.</p>
            </div>
            <div className="p-4 bg-surface-100 rounded-xl">
              <p className="text-sm font-display font-600 text-surface-900 mb-1">Search History</p>
              <p className="text-xs text-surface-600 leading-relaxed">Up to 10 recent searches are stored to power the Recent Searches feature. You can delete them individually or all at once from the Search page.</p>
            </div>
            <div className="p-4 bg-surface-100 rounded-xl">
              <p className="text-sm font-display font-600 text-surface-900 mb-1">Account Deletion</p>
              <p className="text-xs text-surface-600 leading-relaxed">Requesting deletion initiates a 30-day GDPR Art.17 window. Your data is permanently erased after the deadline. Manage this from your Profile page.</p>
            </div>
          </div>
        </Card>

        {/* App */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Palette className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="font-display font-700 text-surface-900">App Preferences</h3>
              <p className="text-xs text-surface-600">Onboarding and display settings</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-display font-500 text-surface-900">Onboarding complete</p>
              <p className="text-xs text-surface-600">Toggle to re-run the onboarding flow</p>
            </div>
            <Toggle checked={onboardingDone} onChange={handleOnboardingToggle} />
          </div>
        </Card>

        {/* Account */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center">
              <Globe className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="font-display font-700 text-surface-900">Account</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-100 rounded-xl">
              <div>
                <p className="text-sm font-display font-500 text-surface-900">Provider</p>
                <p className="text-xs text-surface-600">{user?.auth_provider ?? 'email'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-100 rounded-xl">
              <div>
                <p className="text-sm font-display font-500 text-surface-900">API Version</p>
                <p className="text-xs text-surface-600">v1 · NearMe Backend 1.0.0</p>
              </div>
            </div>
          </div>
          <Button variant="danger" className="w-full mt-4" onClick={() => { logout(); toast.success('Signed out'); }} icon={<LogOut className="w-4 h-4" />}>
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
