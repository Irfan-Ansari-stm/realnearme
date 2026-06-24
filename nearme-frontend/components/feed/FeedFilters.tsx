'use client';
import { useFeedStore } from '@/store';
import { Button } from '@/components/ui';
import { X } from 'lucide-react';
import clsx from 'clsx';

const VIBES = ['chill','party','date_night','family','cosy','hidden_gem','lively','scenic'];
const CATEGORIES = ['cafe','pub','park','restaurant','art','hidden_gem','beach','other'];
const RADII = [1, 2, 5, 10, 20, 50];

const vibeEmoji: Record<string, string> = {
  chill: '😌', party: '🎉', date_night: '🌙', family: '👨‍👩‍👧',
  cosy: '🛋️', hidden_gem: '💎', lively: '⚡', scenic: '🌄',
};

const catEmoji: Record<string, string> = {
  cafe: '☕', pub: '🍺', park: '🌳', restaurant: '🍽️',
  art: '🎨', hidden_gem: '💎', beach: '🏖️', other: '📍',
};

export function FeedFilters({ onClose }: { onClose: () => void }) {
  const { radiusKm, selectedVibes, selectedCategories, priceRange,
    setRadius, toggleVibe, toggleCategory, setPriceRange, resetFilters } = useFeedStore();

  return (
    <div className="card p-6 mb-6 animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-700 text-surface-900">Filters</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetFilters}>Reset all</Button>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Radius */}
        <div>
          <label className="label">Radius</label>
          <div className="flex flex-wrap gap-2">
            {RADII.map((r) => (
              <button key={r} onClick={() => setRadius(r)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-display font-500 transition-all border',
                  radiusKm === r ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
                {r}km
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="label">Price Range</label>
          <div className="flex flex-wrap gap-2">
            {['Free','£','££','£££','££££'].map((p, i) => (
              <button key={i} onClick={() => setPriceRange([0, i])}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-display font-500 transition-all border',
                  priceRange[1] === i ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Vibes */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="label">Vibes</label>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button key={v} onClick={() => toggleVibe(v)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-display font-500 transition-all border flex items-center gap-1',
                  selectedVibes.includes(v) ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
                {vibeEmoji[v]} {v.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="md:col-span-2">
          <label className="label">Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => toggleCategory(c)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-display font-500 transition-all border flex items-center gap-1',
                  selectedCategories.includes(c) ? 'bg-brand-500 text-white border-brand-500' : 'bg-surface-100 text-surface-600 border-surface-200 hover:border-brand-500/40')}>
                {catEmoji[c]} {c.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
