import Link from 'next/link';
import { VendorMark } from '@/components/ui/primitives';
import type { Purchase } from '@/lib/types';
import type { CheckoutReceipt } from '@/components/chat/checkout-modal';
import { formatDate, formatMoney } from '@/lib/utils';

export function PurchaseCard({
  purchase,
  receipt,
  vendorInitials,
  vendorColor,
}: {
  purchase: Purchase;
  receipt?: CheckoutReceipt;
  vendorInitials: string;
  vendorColor: string;
}) {
  return (
    <div className="animate-rise overflow-hidden rounded-xl2 border border-good/25 bg-surface shadow-[0_10px_36px_-20px_var(--color-good)]">
      <div className="flex items-center gap-2 border-b border-line bg-good-soft px-4 py-2.5">
        <svg viewBox="0 0 20 20" className="size-4 text-good" aria-hidden>
          <path
            d="M4.5 10.5l3.5 3.5 7.5-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-good">
          Purchase complete
        </span>
      </div>

      <div className="flex items-start gap-3.5 p-5">
        <VendorMark initials={vendorInitials} color={vendorColor} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-tight">
            {purchase.vendor} {purchase.product}
          </p>
          <p className="text-[13px] text-ink-3">
            {formatMoney(purchase.price, purchase.currency)}
            {purchase.billing_cycle === 'annual'
              ? '/year'
              : purchase.billing_cycle === 'one_time'
                ? ' one-time'
                : '/month'}
            {purchase.renewal_date && ` · renews ${formatDate(purchase.renewal_date)}`}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-line bg-line text-[12.5px] sm:grid-cols-4">
        <Cell label="Transaction" value={receipt?.transactionId ?? purchase.transaction_id ?? '—'} mono />
        <Cell label="Paid with" value={purchase.card_last4 ? `token ••${purchase.card_last4}` : 'Prava token'} />
        <Cell label="Status" value="Paid" tone="good" />
        <Cell label="Invoice" value="View →" href={purchase.invoice_url ?? undefined} />
      </dl>
    </div>
  );
}

function Cell({
  label,
  value,
  href,
  mono,
  tone,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
  tone?: 'good';
}) {
  const body = (
    <>
      <dt className="text-[11px] uppercase tracking-wider text-ink-3">{label}</dt>
      <dd
        className={`mt-1 truncate ${mono ? 'font-mono text-[11.5px]' : ''} ${
          tone === 'good' ? 'font-medium text-good' : 'text-ink-2'
        }`}
        title={value}
      >
        {value}
      </dd>
    </>
  );

  return href ? (
    <Link
      href={href}
      target="_blank"
      className="bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
    >
      {body}
    </Link>
  ) : (
    <div className="bg-surface px-4 py-3">{body}</div>
  );
}
