'use client';

import { useState } from 'react';
import { TrustBadge } from '@/components/chat/trust-badge';
import { Badge, Button, Spinner, VendorMark } from '@/components/ui/primitives';
import type { Approval, Recommendation } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

export function ApprovalCard({
  approval,
  recommendation,
  vendorInitials,
  vendorColor,
  state,
  onApprove,
  onDecline,
}: {
  approval: Approval;
  recommendation?: Recommendation;
  vendorInitials: string;
  vendorColor: string;
  state: 'pending' | 'working' | 'approved' | 'declined';
  onApprove: () => void;
  onDecline: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const decided = state === 'approved' || state === 'declined';

  const cycleLabel =
    approval.billing_cycle === 'annual'
      ? '/year'
      : approval.billing_cycle === 'one_time'
        ? ' one-time'
        : '/month';

  return (
    <div className="animate-rise overflow-hidden rounded-xl2 border-2 border-accent/25 bg-surface shadow-[0_10px_36px_-18px_var(--color-accent)]">
      <div className="flex items-center gap-2 border-b border-line bg-accent-soft px-4 py-2.5">
        <svg viewBox="0 0 20 20" className="size-4 text-accent-ink" aria-hidden>
          <path
            d="M10 2.5l6.5 3v5c0 3.4-2.6 6.4-6.5 7.5-3.9-1.1-6.5-4.1-6.5-7.5v-5l6.5-3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-accent-ink">
          Approval required
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <VendorMark initials={vendorInitials} color={vendorColor} size="lg" />

          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold leading-tight tracking-tight">
              {approval.vendor}
            </p>
            <p className="text-[13px] text-ink-3">
              {approval.plan} · {approval.category}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[22px] font-semibold leading-none tracking-tight tabular-nums">
              {formatMoney(approval.price, approval.currency)}
            </p>
            <p className="mt-1 text-[12px] text-ink-3">{cycleLabel.trim()}</p>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {recommendation?.trust ? (
            <TrustBadge report={recommendation.trust} />
          ) : approval.trust_score != null ? (
            <Badge tone={approval.trust_score >= 85 ? 'good' : 'accent'}>
              Trust {approval.trust_score}/100
            </Badge>
          ) : null}

          {(recommendation?.monthlySaving ?? approval.monthly_saving) ? (
            <Badge tone="good">
              Saves{' '}
              {formatMoney((recommendation?.monthlySaving ?? approval.monthly_saving) as number)}/mo
              vs the priciest option
            </Badge>
          ) : null}
        </div>

        <p className="mt-3.5 text-[14px] leading-relaxed text-ink-2">{approval.reasoning}</p>

        {expanded && (
          <div className="animate-fade mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <PointList title="Why this one" tone="good" points={approval.pros} />
            <PointList title="What we give up" tone="warn" points={approval.cons} />
            {recommendation?.runnerUp && (
              <p className="text-[13px] leading-relaxed text-ink-3 sm:col-span-2">
                <span className="font-medium text-ink-2">
                  Runner-up: {recommendation.runnerUp.vendor}
                </span>{' '}
                — {recommendation.runnerUp.why}
              </p>
            )}
          </div>
        )}

        {(approval.pros.length > 0 || approval.cons.length > 0) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-[13px] font-medium text-accent-ink underline-offset-2 hover:underline"
          >
            {expanded ? 'Hide reasoning' : 'See the full reasoning'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line bg-surface-2/60 px-5 py-4">
        {state === 'approved' ? (
          <p className="flex items-center gap-2 text-[13px] font-medium text-good">
            <span className="size-1.5 rounded-full bg-good" /> Approved — payment executed via Prava
          </p>
        ) : state === 'declined' ? (
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink-3">
            <span className="size-1.5 rounded-full bg-ink-3" /> Declined — nothing was purchased
          </p>
        ) : (
          <>
            <Button onClick={onApprove} disabled={state === 'working'} className="flex-1">
              {state === 'working' ? (
                <>
                  <Spinner /> Opening Prava…
                </>
              ) : (
                <>Approve &amp; pay {formatMoney(approval.price, approval.currency)}</>
              )}
            </Button>
            <Button variant="ghost" onClick={onDecline} disabled={state === 'working'}>
              Cancel
            </Button>
          </>
        )}

        {!decided && (
          <span className="ml-auto hidden text-[12px] text-ink-3 sm:block">
            Card details stay inside Prava
          </span>
        )}
      </div>
    </div>
  );
}

function PointList({
  title,
  points,
  tone,
}: {
  title: string;
  points: string[];
  tone: 'good' | 'warn';
}) {
  if (!points.length) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{title}</p>
      <ul className="space-y-1.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-[13px] leading-snug text-ink-2">
            <span
              className={`mt-[5px] size-1.5 shrink-0 rounded-full ${
                tone === 'good' ? 'bg-good' : 'bg-warn'
              }`}
              aria-hidden
            />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
