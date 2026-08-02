import { formatMoney } from '@/lib/utils';

/**
 * Horizontal bars, widest first. A bar chart rather than a pie: comparing
 * lengths against a shared baseline is the thing eyes are actually good at.
 */
export function SpendChart({ data }: { data: { label: string; value: number }[] }) {
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, 6);
  const max = Math.max(...rows.map((r) => r.value), 1);

  if (!rows.length) {
    return <p className="mt-3 text-[13px] text-ink-3">No active subscriptions yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="truncate text-ink-2">{row.label}</span>
            <span className="shrink-0 tabular-nums text-ink-3">{formatMoney(row.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent/70"
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
