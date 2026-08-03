import Link from 'next/link';
import { QuickPrompt } from '@/components/dashboard/quick-prompt';
import { SpendChart } from '@/components/dashboard/spend-chart';
import { Badge, Card, EmptyState, SectionHeading, VendorMark } from '@/components/ui/primitives';
import { getVendor } from '@/lib/catalog/vendors';
import { getStats, listApprovals, listPurchases, listSubscriptions } from '@/lib/store';
import { daysUntil, formatDate, formatMoney, relativeDays } from '@/lib/utils';

export const metadata = { title: 'Dashboard · Parch' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [stats, purchases, subscriptions, approvals] = await Promise.all([
    getStats(),
    listPurchases(),
    listSubscriptions(),
    listApprovals(),
  ]);

  const recent = purchases.slice(0, 5);
  const upcoming = subscriptions
    .filter((s) => s.status !== 'cancelled' && daysUntil(s.next_payment) <= 45)
    .slice(0, 5);
  const pending = approvals.filter((a) => a.status === 'pending');

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Dashboard</h1>
        <p className="mt-1 text-[15px] text-ink-3">
          {process.env.DEMO_COMPANY_NAME || 'Acme Inc.'} · {stats.activeSubscriptions} active
          subscriptions
        </p>
      </header>

      <QuickPrompt />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Monthly spend"
          value={formatMoney(stats.monthlySpend)}
          sub={`${formatMoney(stats.annualisedSpend)} annualised`}
        />
        <Stat
          label="Active subscriptions"
          value={String(stats.activeSubscriptions)}
          sub={`${stats.upcomingRenewals} renew within 30 days`}
        />
        <Stat
          label="Saved by Parch"
          value={formatMoney(stats.monthlySavings)}
          sub="per month vs the priciest shortlisted option"
          tone={stats.monthlySavings > 0 ? 'good' : undefined}
        />
        <Stat
          label="Pending approvals"
          value={String(stats.pendingApprovals)}
          sub={stats.pendingApprovals ? 'waiting on you' : 'nothing to review'}
          tone={stats.pendingApprovals ? 'warn' : undefined}
        />
      </div>

      {pending.length > 0 && (
        <Card className="mt-6 border-accent/25 bg-accent-soft/40">
          <SectionHeading
            title="Waiting on your approval"
            action={
              <Link href="/chat" className="text-[13px] font-medium text-accent-ink hover:underline">
                Open chat →
              </Link>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {pending.map((approval) => (
              <li key={approval.id} className="flex items-center gap-3 px-5 py-3.5">
                <VendorMark
                  initials={getVendor(approval.vendor_slug)?.initials ?? '··'}
                  color={getVendor(approval.vendor_slug)?.brandColor ?? '#1F2937'}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">
                    {approval.vendor} {approval.plan}
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-3">
                    Requested {formatDate(approval.created_at)}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-medium tabular-nums">
                  {formatMoney(approval.price, approval.currency)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <SectionHeading
            title="Recent purchases"
            action={
              <Link href="/purchases" className="text-[13px] font-medium text-ink-3 hover:text-ink">
                All →
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Nothing bought yet"
              body="Ask Parch for something and approve it — purchases land here."
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {recent.map((purchase) => (
                <li key={purchase.id} className="flex items-center gap-3 px-5 py-3.5">
                  <VendorMark
                    initials={getVendor(purchase.vendor_slug)?.initials ?? initialsOf(purchase.vendor)}
                    color={getVendor(purchase.vendor_slug)?.brandColor ?? '#1F2937'}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{purchase.vendor}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      {purchase.product} · {formatDate(purchase.created_at)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[14px] font-medium tabular-nums">
                      {formatMoney(purchase.price, purchase.currency)}
                    </span>
                    <span className="block text-[11.5px] text-ink-3">
                      {purchase.billing_cycle === 'annual' ? '/yr' : '/mo'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <SectionHeading
              title="Upcoming renewals"
              action={
                <Link href="/renewals" className="text-[13px] font-medium text-ink-3 hover:text-ink">
                  All →
                </Link>
              }
            />
            {upcoming.length === 0 ? (
              <EmptyState title="No renewals due" body="Nothing bills in the next 45 days." />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {upcoming.map((sub) => {
                  const days = daysUntil(sub.next_payment);
                  return (
                    <li key={sub.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{sub.vendor}</span>
                        <span className="block truncate text-[12.5px] text-ink-3">
                          {formatDate(sub.next_payment)}
                        </span>
                      </span>
                      <Badge tone={days <= 7 ? 'warn' : 'neutral'}>{relativeDays(sub.next_payment)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold tracking-tight">Spend by vendor</p>
            <SpendChart
              data={subscriptions
                .filter((s) => s.status !== 'cancelled')
                .map((s) => ({
                  label: s.vendor,
                  value: s.billing_cycle === 'annual' ? s.price / 12 : s.price,
                }))}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <Card className="p-5">
      <p className="text-[12px] font-medium uppercase tracking-wider text-ink-3">{label}</p>
      <p
        className={`mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${
          tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : ''
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[12.5px] leading-snug text-ink-3">{sub}</p>
    </Card>
  );
}

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}
