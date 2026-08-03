import { TrustStars } from '@/components/chat/trust-badge';
import type { Comparison } from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';

export function ComparisonTable({
  comparison,
  winner,
}: {
  comparison: Comparison;
  winner?: string;
}) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <Th>Vendor</Th>
            <Th>Plan</Th>
            <Th className="text-right">Monthly</Th>
            <Th>Trust</Th>
            <Th>Includes</Th>
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr
              key={row.slug}
              className={cn(
                'border-b border-line/70 last:border-0 align-top',
                winner === row.slug && 'bg-accent-soft/50',
              )}
            >
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2 font-medium text-ink">
                  {row.vendor}
                  {winner === row.slug && (
                    <span className="rounded-full border border-accent-ink/15 bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-ink">
                      Pick
                    </span>
                  )}
                </span>
              </td>

              <td className="py-2.5 pr-3 text-ink-2">{row.plan}</td>

              <td className="py-2.5 pr-3 text-right tabular-nums">
                <span className={cn('font-medium', row.withinBudget ? 'text-ink' : 'text-bad')}>
                  {formatMoney(row.monthlyEquivalent)}
                </span>
                {row.cycle === 'annual' && (
                  <div className="text-[11px] text-ink-3">billed yearly</div>
                )}
                {row.cycle === 'one_time' && (
                  <div className="text-[11px] text-ink-3">
                    {formatMoney(row.price)} one-time
                  </div>
                )}
                {!row.withinBudget && comparison.budget != null && (
                  <div className="text-[11px] text-bad">over budget</div>
                )}
              </td>

              <td className="py-2.5 pr-3">
                {row.trustScore == null ? (
                  <span className="text-xs text-ink-3">—</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <TrustStars score={row.trustScore} className="text-warn" />
                    <span className="font-mono text-[11px] text-ink-3">{row.trustScore}</span>
                  </span>
                )}
              </td>

              <td className="py-2.5 text-[13px] leading-snug text-ink-3">
                {row.limits ?? row.highlights[0]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {comparison.budget != null && (
        <p className="pt-2.5 text-[12px] text-ink-3">
          Normalised to monthly cost against a {formatMoney(comparison.budget)}/month ceiling.
        </p>
      )}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3',
        className,
      )}
    >
      {children}
    </th>
  );
}
