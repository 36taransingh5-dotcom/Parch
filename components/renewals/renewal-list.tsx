'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, Spinner, VendorMark } from '@/components/ui/primitives';
import { getVendor } from '@/lib/catalog/vendors';
import type { Subscription } from '@/lib/types';
import { cn, daysUntil, formatDate, formatMoney, relativeDays } from '@/lib/utils';

type Plan = { name: string; price: number };

export function RenewalList({
  subscriptions,
  downgrades,
}: {
  subscriptions: Subscription[];
  downgrades: Record<string, Plan[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (
    id: string,
    action: 'renew' | 'cancel' | 'downgrade',
    plan?: Plan,
  ) => {
    setBusyId(id);
    setError(null);
    setOpenMenu(null);

    try {
      const res = await fetch('/api/renewals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, plan: plan?.name, price: plan?.price }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'That did not work.');
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusyId(null);
    }
  };

  if (!subscriptions.length) {
    return (
      <EmptyState
        title="No subscriptions"
        body="Renewals appear once OpsPilot buys something on a recurring plan."
      />
    );
  }

  return (
    <>
      {error && (
        <p className="border-b border-bad/20 bg-bad-soft px-5 py-2.5 text-[13px] text-bad">
          {error}
        </p>
      )}

      <ul className="divide-y divide-line">
        {subscriptions.map((sub) => {
          const vendor = getVendor(sub.vendor_slug);
          const days = daysUntil(sub.next_payment);
          const cancelled = sub.status === 'cancelled';
          const busy = busyId === sub.id || (pending && busyId === sub.id);
          const plans = (downgrades[sub.vendor_slug] ?? []).filter((p) => p.price < sub.price);

          return (
            <li
              key={sub.id}
              className={cn('flex flex-wrap items-center gap-3 px-5 py-4', cancelled && 'opacity-55')}
            >
              <VendorMark
                initials={vendor?.initials ?? sub.vendor.slice(0, 2).toUpperCase()}
                color={vendor?.brandColor ?? '#1F2937'}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">
                  {sub.vendor}
                  <span className="ml-2 text-[13px] font-normal text-ink-3">{sub.plan}</span>
                </p>
                <p className="truncate text-[13px] text-ink-3">
                  {formatMoney(sub.price, sub.currency)}
                  {sub.billing_cycle === 'annual' ? '/year' : '/month'} ·{' '}
                  {cancelled ? 'cancelled' : `next ${formatDate(sub.next_payment)}`}
                </p>
              </div>

              {!cancelled && (
                <Badge tone={days < 0 ? 'bad' : days <= 7 ? 'warn' : 'neutral'}>
                  {relativeDays(sub.next_payment)}
                </Badge>
              )}

              <div className="relative flex items-center gap-2">
                {busy ? (
                  <span className="px-3 text-ink-3">
                    <Spinner />
                  </span>
                ) : cancelled ? (
                  <Button variant="secondary" onClick={() => act(sub.id, 'renew')}>
                    Reactivate
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => act(sub.id, 'renew')}>
                      Renew
                    </Button>

                    {plans.length > 0 && (
                      <Button
                        variant="ghost"
                        onClick={() => setOpenMenu(openMenu === sub.id ? null : sub.id)}
                        aria-expanded={openMenu === sub.id}
                      >
                        Downgrade
                      </Button>
                    )}

                    <Button variant="ghost" onClick={() => act(sub.id, 'cancel')}>
                      Cancel
                    </Button>
                  </>
                )}

                {openMenu === sub.id && (
                  <div className="animate-rise absolute right-0 top-full z-10 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
                    <p className="border-b border-line px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      Move to
                    </p>
                    {plans.map((plan) => (
                      <button
                        key={plan.name}
                        type="button"
                        onClick={() => act(sub.id, 'downgrade', plan)}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-surface-2"
                      >
                        <span className="truncate">{plan.name}</span>
                        <span className="shrink-0 tabular-nums text-ink-3">
                          {formatMoney(plan.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
