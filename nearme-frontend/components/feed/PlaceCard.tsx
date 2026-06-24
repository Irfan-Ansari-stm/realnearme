'use client';
import { MapPin, Star, Bookmark, BookmarkCheck, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

interface Place {
  place_id: string;
  name: string;
  category: string;
  vibes: string[];
  distance_km: number;
  rating: number | null;
  rating_count: number;
  price_level: string | null;
  open_now: boolean | null;
  photo_urls: string[];
  has_ugc_photo: boolean;
  save_count: number;
  score: number;
}

const categoryColors: Record<string, string> = {
  cafe: 'badge-orange', pub: 'badge-blue', park: 'badge-green',
  restaurant: 'badge-orange', art: 'badge-blue', hidden_gem: 'badge-red',
  beach: 'badge-blue', other: 'badge-gray',
};

const priceLabels: Record<string, string> = { '0': 'Free', '1': '£', '2': '££', '3': '£££', '4': '££££' };

export function PlaceCard({ place, index, isSaved, onToggleSave }: {
  place: Record<string, unknown>; index: number; isSaved: boolean; onToggleSave: () => void;
}) {
  const p = place as unknown as Place;
  const photoUrl = Array.isArray(p.photo_urls) && p.photo_urls.length > 0 ? p.photo_urls[0] : null;

  return (
    <div
      className="card-hover overflow-hidden group animate-fade-up cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image */}
      <div className="relative h-44 bg-surface-200 overflow-hidden">
        {photoUrl ? (
          <img src={photoUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-10 h-10 text-surface-400" />
          </div>
        )}

        {/* Open/closed badge */}
        {p.open_now !== null && (
          <div className={clsx('absolute top-3 left-3 badge text-xs', p.open_now ? 'badge-green' : 'badge-red')}>
            {p.open_now ? 'Open' : 'Closed'}
          </div>
        )}

        {/* UGC indicator */}
        {p.has_ugc_photo && (
          <div className="absolute top-3 right-10 badge badge-orange text-xs">📸 UGC</div>
        )}

        {/* Save button */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSave(); }}
          className={clsx(
            'absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
            isSaved ? 'bg-brand-500 text-white' : 'bg-black/40 text-white hover:bg-brand-500'
          )}
        >
          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      <Link href={`/places/${p.place_id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-600 text-surface-900 text-sm leading-tight line-clamp-2 group-hover:text-brand-400 transition-colors">
            {p.name}
          </h3>
          {p.price_level && (
            <span className="text-surface-500 text-xs font-mono flex-shrink-0">{priceLabels[p.price_level]}</span>
          )}
        </div>

        {/* Distance + rating */}
        <div className="flex items-center gap-3 text-xs text-surface-500 mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}m` : `${p.distance_km.toFixed(1)}km`}
          </span>
          {p.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-brand-400" />
              {p.rating} <span className="text-surface-600">({p.rating_count})</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bookmark className="w-3 h-3" />
            {p.save_count}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className={clsx('badge text-xs', categoryColors[p.category] || 'badge-gray')}>{p.category}</span>
          {Array.isArray(p.vibes) && p.vibes.slice(0, 2).map((v) => (
            <span key={v} className="badge badge-gray text-xs">{v}</span>
          ))}
        </div>

        {/* Score bar */}
        <div className="mt-3 pt-3 border-t border-surface-200 flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-brand-400" />
          <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
              style={{ width: `${Math.min(100, (p.score / 50) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-surface-500 font-mono">{p.score?.toFixed(1)}</span>
        </div>
      </Link>
    </div>
  );
}
