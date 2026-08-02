import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink text-white border-ink',
  accent: 'bg-accent text-accent-ink border-accent-ink/15',
  good: 'bg-good-soft text-good border-good/20',
  warn: 'bg-warn-soft text-warn border-warn/25',
  bad: 'bg-bad-soft text-bad border-bad/20',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-ink border border-accent-ink/20 hover:brightness-105 active:brightness-95 shadow-[2px_2px_0_var(--color-ink)]',
  secondary:
    'bg-surface text-ink border border-line-strong hover:border-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-accent-soft hover:text-ink',
  danger: 'bg-bad-soft text-bad border border-bad/20 hover:bg-bad/10',
};

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        'display-type inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs tracking-wide',
        'transition-[filter,background-color,color,border-color,transform] duration-150 active:translate-x-px active:translate-y-px',
        'disabled:pointer-events-none disabled:opacity-45',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent',
        className,
      )}
      aria-hidden
    />
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('size-3.5 shrink-0', className)} aria-hidden>
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VendorMark({
  initials,
  color,
  size = 'md',
}: {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimensions = { sm: 'size-7 text-[10px]', md: 'size-9 text-xs', lg: 'size-12 text-sm' };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-black/15 font-semibold tracking-wide text-white shadow-[2px_2px_0_oklch(19%_0.006_80_/_0.1)]',
        dimensions[size],
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-3">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <h2 className="display-type text-[13px] tracking-wide text-ink">{title}</h2>
      {action}
    </div>
  );
}
