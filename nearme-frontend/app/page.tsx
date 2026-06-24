import Link from 'next/link';
import { MapPin, Compass, Bookmark, Star, Zap, Shield, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-0 overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-surface-0/80 backdrop-blur-xl border-b border-surface-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-800 text-xl text-surface-900">NearMe</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-surface-600 hover:text-surface-900 font-display font-500 text-sm transition-colors">Sign in</Link>
          <Link href="/register" className="bg-brand-500 hover:bg-brand-400 text-white font-display font-600 text-sm px-4 py-2 rounded-xl transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 flex flex-col items-center text-center">
        {/* Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-display font-500 px-4 py-2 rounded-full mb-8">
            <Zap className="w-3.5 h-3.5" />
            AI-powered local discovery
          </div>

          <h1 className="font-display font-800 text-6xl md:text-7xl text-surface-900 tracking-tight leading-[1.05] mb-6">
            Discover the places<br />
            <span className="text-gradient">worth going to</span>
          </h1>

          <p className="text-surface-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            NearMe uses a 6-factor ranking algorithm to surface cafés, parks, hidden gems,
            and vibrant spots tailored to your exact taste — right around you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary flex items-center gap-2 text-base px-8 py-4">
              Start exploring <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-ghost text-base px-8 py-4">
              Sign in
            </Link>
          </div>
        </div>

        {/* Floating cards */}
        <div className="relative mt-20 w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'The Cosy Corner Café', cat: 'cafe', vibe: 'chill', dist: '0.3 km', rating: 4.8, saves: 312 },
              { name: 'Riverside Hidden Garden', cat: 'park', vibe: 'scenic', dist: '0.8 km', rating: 4.9, saves: 541 },
              { name: 'Ember & Ash Bar', cat: 'pub', vibe: 'lively', dist: '1.2 km', rating: 4.6, saves: 228 },
            ].map((place, i) => (
              <div key={i} className={`card p-5 animate-fade-up`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="h-28 bg-gradient-to-br from-surface-200 to-surface-300 rounded-xl mb-4 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-surface-500" />
                </div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display font-600 text-surface-900 text-sm">{place.name}</p>
                    <p className="text-surface-500 text-xs mt-0.5">{place.dist} away</p>
                  </div>
                  <span className="badge-orange text-xs">{place.vibe}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-surface-500 mt-3 pt-3 border-t border-surface-200">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-brand-400" /> {place.rating}</span>
                  <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" /> {place.saves} saves</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-surface-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display font-800 text-4xl text-surface-900 text-center mb-4">Everything you need</h2>
          <p className="text-surface-600 text-center mb-16 max-w-xl mx-auto">From intelligent discovery to community-driven content moderation — NearMe is built end-to-end.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Compass, title: 'Ranked Discovery', desc: 'Our 6-factor algorithm weighs proximity, vibes, rating, recency, and more — in real time.', color: 'text-brand-400' },
              { icon: Bookmark, title: 'Save & Organise', desc: 'Bookmark your favourite spots. Access your saved places offline, sorted by category.' , color: 'text-blue-400' },
              { icon: Star, title: 'User Posts', desc: 'Share photos and stories about the places you love. Community-vetted via SafeSearch moderation.', color: 'text-green-400' },
              { icon: Zap, title: 'Real-time Filters', desc: 'Filter by vibe, category, price range, and distance. Results update instantly.', color: 'text-yellow-400' },
              { icon: Shield, title: 'Safe by Design', desc: 'Row-level security, GDPR Art.17 deletion, immutable audit log, and session revocation.', color: 'text-purple-400' },
              { icon: MapPin, title: 'PostGIS Spatial', desc: 'Powered by PostgreSQL + PostGIS for accurate spherical-distance queries worldwide.', color: 'text-red-400' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card-hover p-6">
                <Icon className={`w-6 h-6 ${color} mb-4`} />
                <h3 className="font-display font-700 text-surface-900 mb-2">{title}</h3>
                <p className="text-surface-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center border-t border-surface-200">
        <h2 className="font-display font-800 text-4xl text-surface-900 mb-4">Ready to explore?</h2>
        <p className="text-surface-600 mb-8">Join thousands discovering their city in a whole new way.</p>
        <Link href="/register" className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
          Create free account <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="border-t border-surface-200 px-6 py-8 text-center text-surface-500 text-sm">
        <p>© 2025 NearMe. Built with Next.js + PostgreSQL + PostGIS.</p>
      </footer>
    </main>
  );
}
