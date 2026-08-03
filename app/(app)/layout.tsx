import Link from 'next/link';
import { NavLink } from '@/components/shell/nav-link';
import { agentMode } from '@/lib/agent/run';
import { pravaMode } from '@/lib/prava/client';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' as const },
  { href: '/chat', label: 'Chat', icon: 'chat' as const },
  { href: '/purchases', label: 'Purchases', icon: 'receipt' as const },
  { href: '/renewals', label: 'Renewals', icon: 'clock' as const },
  { href: '/settings', label: 'Settings', icon: 'gear' as const },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const prava = pravaMode();
  const agent = agentMode();

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink/15 bg-canvas/72 px-3 py-5 backdrop-blur-xl md:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
          <span className="inline-flex size-7 items-center justify-center rounded-md border border-ink/15 bg-accent shadow-[2px_2px_0_var(--color-ink)]">
            <svg viewBox="0 0 20 20" className="size-4 text-ink" aria-hidden>
              <path
                d="M10 2.5l6.5 4v7l-6.5 4-6.5-4v-7l6.5-4z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.1" fill="currentColor" />
            </svg>
          </span>
          <span className="display-type text-[17px] tracking-wide">Parch</span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-ink/15 px-2 pt-4">
          <ModeRow
            label="Payments"
            value={prava === 'simulated' ? 'Simulated' : `Prava ${prava}`}
            good={prava !== 'simulated'}
          />
          <ModeRow
            label="Agent"
            value={agent === 'llm' ? 'OpenAI' : 'Scripted'}
            good={agent === 'llm'}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function ModeRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-ink-3">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-medium text-ink-2">
        <span className={`size-1.5 rounded-full ${good ? 'bg-good' : 'bg-warn'}`} />
        {value}
      </span>
    </div>
  );
}

function MobileNav() {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-ink/15 bg-canvas/85 px-3 py-2 backdrop-blur-xl md:hidden">
      {NAV.map((item) => (
        <NavLink key={item.href} {...item} compact />
      ))}
    </div>
  );
}
