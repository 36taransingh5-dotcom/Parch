'use client';

import { useState } from 'react';
import { ComparisonTable } from '@/components/chat/comparison-table';
import { TrustDetail } from '@/components/chat/trust-badge';
import { Check, Spinner, VendorMark } from '@/components/ui/primitives';
import type {
  Comparison,
  PricingResult,
  Recommendation,
  ToolCallRecord,
  TrustReport,
  VendorSummary,
} from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';

export function ToolCard({ call }: { call: ToolCallRecord }) {
  const [open, setOpen] = useState(false);
  const running = call.status === 'running';
  const failed = call.status === 'error';
  const expandable = !running && !failed && hasDetail(call);

  const elapsed = call.endedAt && call.startedAt ? call.endedAt - call.startedAt : null;

  return (
    <div
      className={cn(
        'animate-rise overflow-hidden rounded-xl border bg-surface transition-colors',
        failed ? 'border-bad/25' : 'border-line',
      )}
    >
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        className={cn(
          'relative flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left',
          expandable && 'cursor-pointer hover:bg-surface-2',
        )}
      >
        {running && <div className="shimmer absolute inset-0" aria-hidden />}

        <span
          className={cn(
            'relative flex size-5 shrink-0 items-center justify-center rounded-full',
            running && 'text-accent',
            call.status === 'done' && 'bg-good-soft text-good',
            failed && 'bg-bad-soft text-bad',
          )}
        >
          {running ? <Spinner /> : failed ? '!' : <Check />}
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">
            {call.label}
            {running && <span className="animate-pulse-soft">…</span>}
          </span>
          <span className="block truncate text-[12px] text-ink-3">{subtitle(call)}</span>
        </span>

        {elapsed != null && (
          <span className="relative shrink-0 font-mono text-[11px] text-ink-3">
            {(elapsed / 1000).toFixed(1)}s
          </span>
        )}

        {expandable && (
          <svg
            viewBox="0 0 16 16"
            className={cn(
              'relative size-3.5 shrink-0 text-ink-3 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          >
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && expandable && (
        <div className="animate-fade border-t border-line px-3.5 py-3.5">
          <ToolDetail call={call} />
        </div>
      )}

      {failed && call.error && (
        <p className="border-t border-bad/20 bg-bad-soft px-3.5 py-2 text-[12px] text-bad">
          {call.error}
        </p>
      )}
    </div>
  );
}

// ── Summary line ─────────────────────────────────────────────

function subtitle(call: ToolCallRecord): string {
  const result = call.result as Record<string, unknown> | undefined;

  if (call.status === 'running') {
    switch (call.name) {
      case 'searchVendors':
        return String(call.args.category ?? 'category');
      case 'fetchPricing':
      case 'checkMerchantTrust':
      case 'createRecommendation':
      case 'requestApproval':
        return String(call.args.vendor ?? '');
      case 'compareOptions':
        return Array.isArray(call.args.vendors) ? call.args.vendors.join(' · ') : '';
      default:
        return '';
    }
  }

  if (!result) return '';
  if (result.error) return 'Nothing matched';

  switch (call.name) {
    case 'searchVendors': {
      const vendors = (result.vendors ?? []) as VendorSummary[];
      return `${vendors.length} vendors in ${result.categoryLabel} · ${vendors
        .map((v) => v.name)
        .join(', ')}`;
    }
    case 'fetchPricing': {
      const pricing = result as unknown as PricingResult;
      return `${pricing.vendor} · ${pricing.tiers.length} tiers`;
    }
    case 'compareOptions': {
      const comparison = result as unknown as Comparison;
      const within = comparison.rows.filter((r) => r.withinBudget).length;
      return `${comparison.rows.length} options · ${within} within budget`;
    }
    case 'checkMerchantTrust': {
      const trust = result as unknown as TrustReport;
      return `${trust.vendor} · ${trust.score}/100 · ${trust.label}`;
    }
    case 'createRecommendation': {
      const rec = result as unknown as Recommendation;
      return `${rec.vendor} ${rec.plan} · ${formatMoney(rec.price)}/${
        rec.cycle === 'annual' ? 'yr' : 'mo'
      }`;
    }
    case 'requestApproval':
      return 'Waiting on the founder';
    default:
      return '';
  }
}

function hasDetail(call: ToolCallRecord) {
  if (!call.result || (call.result as Record<string, unknown>).error) return false;
  return ['searchVendors', 'fetchPricing', 'compareOptions', 'checkMerchantTrust'].includes(
    call.name,
  );
}

// ── Expanded detail ──────────────────────────────────────────

function ToolDetail({ call }: { call: ToolCallRecord }) {
  const result = call.result as Record<string, unknown>;

  if (call.name === 'searchVendors') {
    const vendors = (result.vendors ?? []) as VendorSummary[];
    return (
      <ul className="space-y-2.5">
        {vendors.map((vendor) => (
          <li key={vendor.slug} className="flex items-center gap-3">
            <VendorMark initials={vendor.initials} color={vendor.brandColor} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{vendor.name}</span>
              <span className="block truncate text-[12px] text-ink-3">{vendor.tagline}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[13px] font-medium tabular-nums text-ink">
                {vendor.entryPrice === 0 ? 'Free' : `${formatMoney(vendor.entryPrice)}/mo`}
              </span>
              <span className="block text-[11px] text-ink-3">{vendor.entryTier}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (call.name === 'fetchPricing') {
    const pricing = result as unknown as PricingResult & { capturedAt?: string };
    return (
      <div className="space-y-2.5">
        {pricing.tiers.map((tier) => (
          <div key={tier.name} className="flex items-start justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">{tier.name}</span>
              <span className="block text-[12px] leading-snug text-ink-3">
                {tier.features.slice(0, 3).join(' · ')}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[13px] font-medium tabular-nums text-ink">
                {tier.price === 0 ? 'Free' : formatMoney(tier.price)}
              </span>
              <span className="block text-[11px] text-ink-3">{tier.unit}</span>
            </span>
          </div>
        ))}
        {pricing.capturedAt && (
          <p className="pt-1 text-[11px] text-ink-3">
            Published list price, captured {pricing.capturedAt} ·{' '}
            <a
              href={pricing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              source
            </a>
          </p>
        )}
      </div>
    );
  }

  if (call.name === 'compareOptions') {
    return <ComparisonTable comparison={result as unknown as Comparison} />;
  }

  if (call.name === 'checkMerchantTrust') {
    return <TrustDetail report={result as unknown as TrustReport} />;
  }

  return null;
}
