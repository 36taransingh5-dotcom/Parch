import Link from 'next/link';
import { Badge, Card, EmptyState, VendorMark } from '@/components/ui/primitives';
import { getVendor } from '@/lib/catalog/vendors';
import { listPurchases } from '@/lib/store';
import { formatDate, formatMoney, monthlyEquivalent } from '@/lib/utils';

export const metadata = { title: 'Purchases · Parch' };
export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  active: 'good',
  pending: 'warn',
  cancelled: 'neutral',
  failed: 'bad',
} as const;

export default async function PurchasesPage() {
  const purchases = await listPurchases();
  const total = purchases
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + monthlyEquivalent(p.price, p.billing_cycle), 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Purchases</h1>
          <p className="mt-1 text-[15px] text-ink-3">
            {purchases.length} record{purchases.length === 1 ? '' : 's'} ·{' '}
            {formatMoney(total)}/month active
          </p>
        </div>
        <Link
          href="/chat"
          className="display-type rounded-md border border-accent-ink/20 bg-accent px-4 py-2.5 text-xs tracking-wide text-ink shadow-[2px_2px_0_var(--color-ink)] transition-[filter,transform] duration-150 hover:brightness-105 active:translate-x-px active:translate-y-px"
        >
          New procurement
        </Link>
      </header>

      <Card className="overflow-hidden">
        {purchases.length === 0 ? (
          <EmptyState
            title="No purchases yet"
            body="Once you approve something in chat, the record and its invoice show up here."
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/50 text-left">
                  <Th className="pl-5">Vendor</Th>
                  <Th>Category</Th>
                  <Th className="text-right">Price</Th>
                  <Th>Renewal</Th>
                  <Th>Trust</Th>
                  <Th>Status</Th>
                  <Th className="pr-5 text-right">Invoice</Th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const vendor = getVendor(purchase.vendor_slug);
                  return (
                    <tr key={purchase.id} className="border-b border-line/70 last:border-0">
                      <td className="py-3 pl-5 pr-3">
                        <span className="flex items-center gap-2.5">
                          <VendorMark
                            initials={vendor?.initials ?? purchase.vendor.slice(0, 2).toUpperCase()}
                            color={vendor?.brandColor ?? '#1F2937'}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {purchase.vendor}
                            </span>
                            <span className="block truncate text-[12.5px] text-ink-3">
                              {purchase.product}
                            </span>
                          </span>
                        </span>
                      </td>

                      <td className="py-3 pr-3 text-ink-2">{purchase.category}</td>

                      <td className="py-3 pr-3 text-right tabular-nums">
                        <span className="font-medium">
                          {formatMoney(purchase.price, purchase.currency)}
                        </span>
                        <span className="block text-[11.5px] text-ink-3">
                          {purchase.billing_cycle === 'annual'
                            ? 'yearly'
                            : purchase.billing_cycle === 'one_time'
                              ? 'one-time'
                              : 'monthly'}
                        </span>
                      </td>

                      <td className="py-3 pr-3 text-ink-2">
                        {purchase.renewal_date ? formatDate(purchase.renewal_date) : '—'}
                      </td>

                      <td className="py-3 pr-3">
                        {purchase.trust_score == null ? (
                          <span className="text-ink-3">—</span>
                        ) : (
                          <span className="font-mono text-[12px] text-ink-2">
                            {purchase.trust_score}/100
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        <Badge tone={STATUS_TONE[purchase.status]}>{purchase.status}</Badge>
                      </td>

                      <td className="py-3 pr-5 text-right">
                        {purchase.invoice_url ? (
                          <a
                            href={purchase.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-accent-ink underline-offset-2 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`py-2.5 pr-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3 ${className ?? ''}`}
    >
      {children}
    </th>
  );
}
