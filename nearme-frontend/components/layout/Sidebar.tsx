'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  MapPin, Compass, Bookmark, Bell, Search, User, Settings,
  Shield, LogOut, Activity, FileText, Clock, Cpu, Zap, BarChart2, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navLinks = [
  { href: '/feed',          label: 'Discover',       icon: Compass },
  { href: '/search',        label: 'Search',          icon: Search },
  { href: '/saves',         label: 'Saved Places',    icon: Bookmark },
  { href: '/posts',         label: 'My Posts',        icon: FileText },
  { href: '/notifications', label: 'Notifications',   icon: Bell },
  { href: '/profile',       label: 'Profile',         icon: User },
  { href: '/settings',      label: 'Settings',        icon: Settings },
];

const adminLinks = [
  { href: '/admin',             label: 'Dashboard',     icon: BarChart2 },
  { href: '/admin/users',       label: 'Users',         icon: User },
  { href: '/admin/posts',       label: 'Posts',         icon: FileText },
  { href: '/admin/places',      label: 'Places',        icon: MapPin },
  { href: '/admin/reports',     label: 'Reports',       icon: Shield },
  { href: '/admin/moderation',  label: 'Moderation',    icon: Activity },
  { href: '/admin/sessions',    label: 'Sessions',      icon: Cpu },
  { href: '/admin/audit',       label: 'Audit Log',     icon: Clock },
  { href: '/admin/algorithm',   label: 'Algorithm',     icon: Zap },
  { href: '/admin/jobs',        label: 'Cron Jobs',     icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, unreadCount } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refreshToken');
      if (refresh) await authApi.logout(refresh);
    } catch {}
    logout();
    toast.success('Logged out');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-surface-200">
        <Link href="/feed" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-800 text-xl text-surface-900">NearMe</span>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="label px-4 pt-2">Navigation</p>
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              pathname.startsWith(href) && href !== '/'
                ? 'sidebar-link-active'
                : 'sidebar-link'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {href === '/notifications' && unreadCount > 0 && (
              <span className="bg-brand-500 text-white text-xs font-display font-600 px-2 py-0.5 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="label px-4">Admin</p>
            </div>
            {adminLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  pathname === href ? 'sidebar-link-active' : 'sidebar-link'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-4 border-t border-surface-200">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-100 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.photo_url
                ? <img src={user.photo_url} alt={user.display_name} className="w-full h-full object-cover" />
                : <span className="text-brand-400 font-display font-700 text-sm">{user.display_name[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-display font-600 text-surface-900 truncate">{user.display_name}</p>
              <p className="text-xs text-surface-600 truncate">@{user.handle}</p>
            </div>
            <span className={clsx('badge text-xs', user.role === 'admin' ? 'badge-orange' : user.role === 'moderator' ? 'badge-blue' : 'badge-gray')}>
              {user.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-50 border-r border-surface-200 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 bg-surface-100 border border-surface-200 rounded-xl flex items-center justify-center text-surface-700"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-surface-50 border-r border-surface-200 h-full flex flex-col z-10 animate-slide-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-surface-600 hover:text-surface-900"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
