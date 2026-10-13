import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';
import { Loader } from './Loader';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6', className)}
      {...rest}
    />
  );
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-700 text-slate-100',
  success: 'bg-emerald-900 text-emerald-200',
  warning: 'bg-amber-900 text-amber-200',
  danger: 'bg-rose-900 text-rose-200',
  info: 'bg-cyan-900 text-cyan-200',
};

export function Badge({
  tone = 'neutral',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const alertTones: Record<AlertTone, string> = {
  info: 'border-cyan-700 bg-cyan-950 text-cyan-100',
  success: 'border-emerald-700 bg-emerald-950 text-emerald-100',
  warning: 'border-amber-700 bg-amber-950 text-amber-100',
  error: 'border-rose-700 bg-rose-950 text-rose-100',
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border p-3 text-sm', alertTones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div>{children}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {description && <p className="max-w-md text-sm text-slate-400">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-8 text-slate-300">
      <Loader size="lg" label={label} />
    </div>
  );
}
