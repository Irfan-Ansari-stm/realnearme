'use client';
import React from 'react';
import clsx from 'clsx';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// ── Button ─────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-500 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';
  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-400 text-white focus:ring-brand-500/50',
    ghost: 'bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 border border-surface-300 focus:ring-surface-400/30',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 focus:ring-red-500/30',
    outline: 'bg-transparent border border-brand-500/40 text-brand-400 hover:bg-brand-500/10 focus:ring-brand-500/30',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">{icon}</div>}
        <input
          className={clsx(
            'input',
            icon && 'pl-10',
            error && 'border-red-500/50 focus:ring-red-500/30',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Textarea ───────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <textarea
        className={clsx('input resize-none', error && 'border-red-500/50', className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select className={clsx('input', error && 'border-red-500/50', className)} {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────
export function Card({ children, className, hover = false, ...props }: { children: React.ReactNode; className?: string; hover?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx(hover ? 'card-hover' : 'card', 'p-6', className)} {...props}>{children}</div>;
}

// ── Badge ──────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'gray', className }: { children: React.ReactNode; variant?: 'orange' | 'green' | 'red' | 'gray' | 'blue'; className?: string }) {
  const map = { orange: 'badge-orange', green: 'badge-green', red: 'badge-red', gray: 'badge-gray', blue: 'badge-blue' };
  return <span className={clsx(map[variant], className)}>{children}</span>;
}

// ── Modal ──────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-surface-50 border border-surface-200 rounded-2xl w-full shadow-2xl animate-fade-up', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-surface-200">
            <h2 className="font-display font-700 text-lg text-surface-900">{title}</h2>
            <button onClick={onClose} className="text-surface-500 hover:text-surface-900 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('shimmer rounded-xl', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-100 border border-surface-200 text-surface-600 hover:text-surface-900 disabled:opacity-30 transition-all">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = i + 1;
        return (
          <button key={p} onClick={() => onPage(p)} className={clsx('w-9 h-9 rounded-xl text-sm font-display font-500 transition-all', page === p ? 'bg-brand-500 text-white' : 'bg-surface-100 border border-surface-200 text-surface-600 hover:text-surface-900')}>
            {p}
          </button>
        );
      })}
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-100 border border-surface-200 text-surface-600 hover:text-surface-900 disabled:opacity-30 transition-all">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-surface-500" />
      </div>
      <h3 className="font-display font-700 text-lg text-surface-900 mb-1">{title}</h3>
      {description && <p className="text-surface-600 text-sm max-w-xs">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-4">{action.label}</Button>
      )}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, trend, color = 'orange' }: {
  label: string; value: string | number; icon: React.ElementType;
  trend?: { value: string; up: boolean }; color?: 'orange' | 'green' | 'blue' | 'red';
}) {
  const colors = {
    orange: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center', colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={clsx('text-xs font-display font-500', trend.up ? 'text-green-400' : 'text-red-400')}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="font-display font-800 text-2xl text-surface-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-surface-600 text-sm mt-1">{label}</p>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={clsx('relative w-11 h-6 rounded-full transition-colors duration-200', checked ? 'bg-brand-500' : 'bg-surface-300')} onClick={() => onChange(!checked)}>
        <div className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', checked ? 'translate-x-6' : 'translate-x-1')} />
      </div>
      {label && <span className="text-sm text-surface-700 font-body">{label}</span>}
    </label>
  );
}

// ── Page Header ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display font-800 text-3xl text-surface-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-surface-600 mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────────
export function Table({ headers, children, loading }: { headers: string[]; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-surface-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200 bg-surface-100">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 font-display font-500 text-surface-600 text-xs uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                ))}
              </tr>
            ))
          ) : children}
        </tbody>
      </table>
    </div>
  );
}
