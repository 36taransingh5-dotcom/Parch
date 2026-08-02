import { Badge } from '@/components/ui/primitives';
import type { TrustReport } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONE = {
  trusted: 'good',
  established: 'accent',
  caution: 'warn',
} as const;

export function TrustStars({ score, className }: { score: number; className?: string }) {
  // 100 points → 5 stars, rounded to the nearest half.
  const stars = Math.round((score / 20) * 2) / 2;

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${score} out of 100`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, stars - i));
        return (
          <svg key={i} viewBox="0 0 20 20" className="size-3.5" aria-hidden>
            <defs>
              <linearGradient id={`star-${score}-${i}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8L10 1.8z"
              fill={`url(#star-${score}-${i})`}
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}

export function TrustBadge({ report }: { report: TrustReport }) {
  return (
    <Badge tone={TONE[report.band]}>
      <TrustStars score={report.score} />
      {report.label}
    </Badge>
  );
}

export function TrustDetail({ report }: { report: TrustReport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <TrustBadge report={report} />
        <span className="font-mono text-xs text-ink-3">{report.score}/100</span>
        <span className="text-xs text-ink-3">
          {report.provider === 'senso' ? 'verified via Senso' : 'local trust model'}
        </span>
      </div>

      <ul className="space-y-1.5">
        {report.verifiedSources.map((source) => (
          <li key={source.url} className="flex gap-2 text-[13px] leading-snug">
            <span className="mt-[3px] size-1.5 shrink-0 rounded-full bg-good" aria-hidden />
            <span className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink-2 underline-offset-2 hover:underline"
              >
                {source.name}
              </a>
              <span className="text-ink-3"> — {source.note}</span>
            </span>
          </li>
        ))}
      </ul>

      {report.warnings.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-warn/25 bg-warn-soft px-3 py-2.5">
          {report.warnings.map((warning) => (
            <li key={warning} className="flex gap-2 text-[13px] leading-snug text-ink-2">
              <span className="mt-[3px] size-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
              {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
