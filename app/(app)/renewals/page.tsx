import { RenewalList } from '@/components/renewals/renewal-list';
import { Card } from '@/components/ui/primitives';
import { VENDORS } from '@/lib/catalog/vendors';
import { listSubscriptions } from '@/lib/store';
import { daysUntil, formatMoney, monthlyEquivalent } from '@/lib/utils';

export const metadata = { title: 'Renewals · OpsPilot' };
export const dynamic = 'force-dynamic';

export default async function RenewalsPage() {
  const subscriptions = await listSubscriptions();
  const active = subscriptions.filter((s) => s.status !== 'cancelled');

  const monthly = active.reduce((sum, s) => sum + monthlyEquivalent(s.price, s.billing_cycle), 0);
  const next30 = active.filter((s) => {
    const d = daysUntil(s.next_payment);
    return d >= 0 && d <= 30;
  });
  const due30 = next30.reduce((sum, s) => sum + s.price, 0);

  // Downgrade targets come from the catalog: the next cheapest paid tier.
  const downgrades = Object.fromEntries(
    VENDORS.map((vendor) => {
      const paid = vendor.tiers
        .filter((t) => t.price > 0)
        .sort((a, b) => a.price - b.price);
      return [vendor.slug, paid.map((t) => ({ name: t.name, price: t.price }))];
    }),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Renewals</h1>
        <p className="mt-1 text-[15px] text-ink-3">
          {formatMoney(monthly)}/month across {active.length} subscription
          {active.length === 1 ? '' : 's'} · {formatMoney(due30)} bills in the next 30 days
        </p>
      </header>

      <Card className="overflow-hidden">
        <RenewalList subscriptions={subscriptions} downgrades={downgrades} />
      </Card>
    </main>
  );
}
