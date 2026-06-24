import Link from 'next/link';
import { MapPin, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6">
        <MapPin className="w-8 h-8 text-brand-400" />
      </div>
      <h1 className="font-display font-800 text-6xl text-surface-900 mb-3">404</h1>
      <p className="font-display font-600 text-xl text-surface-700 mb-2">Page not found</p>
      <p className="text-surface-500 text-sm mb-8 max-w-sm">The page you're looking for doesn't exist or has been moved.</p>
      <Link href="/feed" className="btn-primary inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Link>
    </div>
  );
}
