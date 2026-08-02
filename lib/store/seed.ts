import { addMonths } from '@/lib/utils';
import { COMPANY_ID, type DB } from './types';

/**
 * Pre-existing spend so the dashboard has something to say before the judge
 * buys anything. Dates are computed relative to today, so the seed never
 * goes stale and renewals always land inside the "upcoming" window.
 */
export function buildSeed(): DB {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
  const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

  const purchases: DB['purchases'] = [
    {
      id: 'pur_seed_vercel',
      company_id: COMPANY_ID,
      vendor: 'Vercel',
      vendor_slug: 'vercel',
      category: 'Hosting',
      product: 'Pro — 2 seats',
      price: 40,
      currency: 'USD',
      billing_cycle: 'monthly',
      renewal_date: daysAhead(6),
      status: 'active',
      invoice_url: '/api/invoices/inv_seed_vercel',
      transaction_id: 'txn_seed_vercel',
      card_last4: '7932',
      trust_score: 94,
      monthly_saving: null,
      reasoning: 'Existing deployment target for the marketing site and dashboard.',
      created_at: daysAgo(84),
    },
    {
      id: 'pur_seed_linear',
      company_id: COMPANY_ID,
      vendor: 'Linear',
      vendor_slug: 'linear',
      category: 'Project management',
      product: 'Standard — 6 seats',
      price: 48,
      currency: 'USD',
      billing_cycle: 'monthly',
      renewal_date: daysAhead(13),
      status: 'active',
      invoice_url: '/api/invoices/inv_seed_linear',
      transaction_id: 'txn_seed_linear',
      card_last4: '7932',
      trust_score: 91,
      monthly_saving: null,
      reasoning: 'Replaced a Jira trial; the whole engineering team already lives in it.',
      created_at: daysAgo(61),
    },
    {
      id: 'pur_seed_notion',
      company_id: COMPANY_ID,
      vendor: 'Notion',
      vendor_slug: 'notion',
      category: 'Docs & wiki',
      product: 'Plus — 6 seats',
      price: 60,
      currency: 'USD',
      billing_cycle: 'monthly',
      renewal_date: daysAhead(22),
      status: 'active',
      invoice_url: '/api/invoices/inv_seed_notion',
      transaction_id: 'txn_seed_notion',
      card_last4: '7932',
      trust_score: 90,
      monthly_saving: null,
      reasoning: 'Company wiki, hiring pipeline and investor updates.',
      created_at: daysAgo(120),
    },
    {
      id: 'pur_seed_sentry',
      company_id: COMPANY_ID,
      vendor: 'Sentry',
      vendor_slug: 'sentry',
      category: 'Error monitoring',
      product: 'Team',
      price: 26,
      currency: 'USD',
      billing_cycle: 'monthly',
      renewal_date: daysAhead(3),
      status: 'active',
      invoice_url: '/api/invoices/inv_seed_sentry',
      transaction_id: 'txn_seed_sentry',
      card_last4: '7932',
      trust_score: 89,
      monthly_saving: 33,
      reasoning: 'Chosen over Bugsnag at 2× the price; unlimited seats was the deciding factor.',
      created_at: daysAgo(45),
    },
    {
      id: 'pur_seed_1password',
      company_id: COMPANY_ID,
      vendor: '1Password',
      vendor_slug: '1password',
      category: 'Password manager',
      product: 'Teams Starter Pack',
      price: 19.95,
      currency: 'USD',
      billing_cycle: 'monthly',
      renewal_date: daysAhead(17),
      status: 'active',
      invoice_url: '/api/invoices/inv_seed_1password',
      transaction_id: 'txn_seed_1password',
      card_last4: '7932',
      trust_score: 96,
      monthly_saving: 28.05,
      reasoning: 'Flat rate for the first 10 people beat Bitwarden per-seat at current headcount.',
      created_at: daysAgo(30),
    },
  ];

  const subscriptions: DB['subscriptions'] = purchases.map((p) => ({
    id: `sub_${p.id.replace('pur_', '')}`,
    company_id: COMPANY_ID,
    purchase_id: p.id,
    vendor: p.vendor,
    vendor_slug: p.vendor_slug,
    plan: p.product,
    price: p.price,
    currency: p.currency,
    billing_cycle: p.billing_cycle,
    next_payment: p.renewal_date ?? addMonths(now, 1).toISOString(),
    status: 'active' as const,
    created_at: p.created_at,
  }));

  const invoices: DB['invoices'] = purchases.map((p, i) => ({
    id: p.invoice_url!.split('/').pop()!,
    company_id: COMPANY_ID,
    purchase_id: p.id,
    number: `OPS-2026-${String(1001 + i).padStart(4, '0')}`,
    amount: p.price,
    currency: p.currency,
    url: p.invoice_url!,
    issued_at: p.created_at,
  }));

  const transactions: DB['transactions'] = purchases.map((p) => ({
    id: p.transaction_id!,
    company_id: COMPANY_ID,
    purchase_id: p.id,
    approval_id: null,
    session_id: `sess_seed_${p.vendor_slug}`,
    order_id: `ord_seed_${p.vendor_slug}`,
    txn_ref_id: `tli_seed_${p.vendor_slug}`,
    amount: p.price,
    currency: p.currency,
    status: 'reported' as const,
    provider: 'prava_simulated' as const,
    created_at: p.created_at,
  }));

  return { purchases, subscriptions, approvals: [], transactions, invoices };
}
