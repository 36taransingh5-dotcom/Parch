import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';

const STEPS = [
  { n: '01', title: 'Researches', body: 'Shortlists real vendors in the category you named.' },
  { n: '02', title: 'Compares', body: 'Normalises every plan to one monthly number.' },
  { n: '03', title: 'Verifies', body: 'Scores each merchant before it will spend with them.' },
  { n: '04', title: 'Asks', body: 'Raises an approval card. It cannot buy without you.' },
  { n: '05', title: 'Pays', body: 'Executes through Prava with a single-use card credential.' },
  { n: '06', title: 'Tracks', body: 'Files the invoice and schedules the renewal.' },
];

const PROMPTS = [
  'Buy an email provider for our startup under $40/month.',
  "We're hiring a developer — get them the best AI code assistant under $25/month.",
  'We need error monitoring. Budget is $30/month.',
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Soft accent wash behind the hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,var(--color-accent-soft),transparent_65%)]"
      />

      <div className="relative mx-auto max-w-5xl px-6">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">OpsPilot</span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Dashboard →
          </Link>
        </header>

        <section className="animate-rise py-20 text-center sm:py-28">
          <Badge tone="accent" className="mb-6">
            <span className="size-1.5 rounded-full bg-accent" />
            Powered by Prava
          </Badge>

          <h1 className="mx-auto max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
            Your AI Procurement Employee.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-2">
            Tell OpsPilot what your team needs and what you&rsquo;ll spend. It researches the
            market, defends a recommendation, and — once you approve — actually buys it.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm shadow-accent/25 transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[.985]"
            >
              Start Procuring
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-6 py-3 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              See the dashboard
            </Link>
          </div>

          <p className="mt-6 text-[13px] text-ink-3">
            No card required to try it — payments run in Prava sandbox.
          </p>
        </section>

        <section className="pb-6">
          <div className="card overflow-hidden">
            <div className="border-b border-line bg-surface-2/60 px-5 py-3 text-[13px] font-medium text-ink-3">
              Try asking
            </div>
            <ul className="divide-y divide-line">
              {PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <Link
                    href={`/chat?q=${encodeURIComponent(prompt)}`}
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                  >
                    <span className="text-[15px] text-ink-2 group-hover:text-ink">
                      &ldquo;{prompt}&rdquo;
                    </span>
                    <span className="shrink-0 text-sm text-ink-3 transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-xl2 border border-line bg-line py-0 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-surface p-6">
              <div className="font-mono text-[11px] tracking-widest text-accent">{step.n}</div>
              <h3 className="mt-3 text-[15px] font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="py-20">
          <div className="card flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                It never spends without you.
              </h2>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-3">
                The agent has no payment tool. Every purchase runs through an approval card you
                click, then a one-time Prava credential — your real card number never touches
                this app.
              </p>
            </div>
            <Link
              href="/chat"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition-[filter] hover:brightness-125"
            >
              Start Procuring
            </Link>
          </div>
        </section>

        <footer className="border-t border-line py-8 text-[13px] text-ink-3">
          OpsPilot · Prava Hackathon 2026
        </footer>
      </div>
    </main>
  );
}

function Logo() {
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-ink">
      <svg viewBox="0 0 20 20" className="size-4 text-white" aria-hidden>
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
  );
}
