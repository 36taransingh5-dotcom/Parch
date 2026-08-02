'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type IconName = 'grid' | 'chat' | 'receipt' | 'clock' | 'gear';

const PATHS: Record<IconName, string> = {
  grid: 'M3.5 3.5h5v5h-5v-5zm8 0h5v5h-5v-5zm-8 8h5v5h-5v-5zm8 0h5v5h-5v-5z',
  chat: 'M3.5 5.5a2 2 0 012-2h9a2 2 0 012 2v6a2 2 0 01-2 2H8l-4.5 3.5v-3.5a2 2 0 01-.5-1.3v-6.7z',
  receipt: 'M4.5 2.5h11v15l-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5-2.2-1.5v-13.5zM7 7h6M7 10.5h6',
  clock: 'M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM10 6.5v4l2.5 1.6',
  gear:
    'M10 7.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zM10 2.5l1 1.9 2.1-.5.6 2.1 2 .8-1 1.9 1 1.9-2 .8-.6 2.1-2.1-.5-1 1.9-1-1.9-2.1.5-.6-2.1-2-.8 1-1.9-1-1.9 2-.8.6-2.1 2.1.5 1-1.9z',
};

export function NavLink({
  href,
  label,
  icon,
  compact = false,
}: {
  href: string;
  label: string;
  icon: IconName;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors',
        compact ? 'shrink-0 px-3 py-2' : 'px-2.5 py-2',
        active
          ? 'bg-accent text-accent-ink shadow-[2px_2px_0_var(--color-ink)]'
          : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      <svg viewBox="0 0 20 20" className="size-[17px] shrink-0" aria-hidden>
        <path
          d={PATHS[icon]}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </Link>
  );
}
