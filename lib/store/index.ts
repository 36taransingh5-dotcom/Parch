import 'server-only';

import type {
  Approval,
  DashboardStats,
  Invoice,
  Purchase,
  Subscription,
  Transaction,
} from '@/lib/types';
import { addMonths, daysUntil, id, monthlyEquivalent } from '@/lib/utils';
import { createFileDriver } from './file-driver';
import { createSupabaseDriver } from './supabase-driver';
import { buildSeed } from './seed';
import { COMPANY_ID, type DB, type StoreDriver } from './types';

export { COMPANY_ID } from './types';
export type { DB } from './types';

// Next.js recreates modules on hot reload; hang the driver off globalThis so
// the in-process write queue and cache survive an edit.
const globalRef = globalThis as typeof globalThis & {
  __opspilotDriver?: StoreDriver;
  __opspilotSeeding?: Promise<void>;
};

function driver(): StoreDriver {
  if (!globalRef.__opspilotDriver) {
    globalRef.__opspilotDriver = createSupabaseDriver() ?? createFileDriver();
  }
  return globalRef.__opspilotDriver;
}

export function storeBackend(): 'file' | 'supabase' {
  return driver().name;
}

/**
 * Seeds the store on first read when it is completely empty, so a fresh
 * clone still shows a populated dashboard. Runs at most once per process.
 */
async function ensureSeeded() {
  if (!globalRef.__opspilotSeeding) {
    globalRef.__opspilotSeeding = (async () => {
      const db = await driver().read();
      const empty =
        db.purchases.length === 0 &&
        db.subscriptions.length === 0 &&
        db.approvals.length === 0;
      if (empty) await driver().reset(buildSeed());
    })().catch(() => undefined);
  }
  await globalRef.__opspilotSeeding;
}

export async function readDB(): Promise<DB> {
  await ensureSeeded();
  return driver().read();
}

// ── Reads ────────────────────────────────────────────────────

export async function listPurchases(): Promise<Purchase[]> {
  const db = await readDB();
  return [...db.purchases].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const db = await readDB();
  return [...db.subscriptions].sort(
    (a, b) => new Date(a.next_payment).getTime() - new Date(b.next_payment).getTime(),
  );
}

export async function listApprovals(): Promise<Approval[]> {
  const db = await readDB();
  return [...db.approvals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listInvoices(): Promise<Invoice[]> {
  const db = await readDB();
  return db.invoices;
}

export async function getApproval(approvalId: string): Promise<Approval | null> {
  const db = await readDB();
  return db.approvals.find((a) => a.id === approvalId) ?? null;
}

export async function getPurchase(purchaseId: string): Promise<Purchase | null> {
  const db = await readDB();
  return db.purchases.find((p) => p.id === purchaseId) ?? null;
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const db = await readDB();
  return db.invoices.find((i) => i.id === invoiceId) ?? null;
}

export async function getStats(): Promise<DashboardStats> {
  const db = await readDB();

  const active = db.subscriptions.filter((s) => s.status === 'active');

  const monthlySpend = active.reduce(
    (sum, s) => sum + monthlyEquivalent(s.price, s.billing_cycle),
    0,
  );

  const upcomingRenewals = active.filter((s) => {
    const d = daysUntil(s.next_payment);
    return d >= 0 && d <= 30;
  }).length;

  const pendingApprovals = db.approvals.filter((a) => a.status === 'pending').length;

  // Savings are only claimed where the agent actually shortlisted a pricier
  // option and picked against it — never modelled against an invented list
  // price.
  const monthlySavings = db.purchases
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + (p.monthly_saving ?? 0), 0);

  return {
    monthlySpend: round2(monthlySpend),
    activeSubscriptions: active.length,
    upcomingRenewals,
    pendingApprovals,
    monthlySavings: round2(monthlySavings),
    annualisedSpend: round2(monthlySpend * 12),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ── Writes ───────────────────────────────────────────────────

export async function createApproval(
  input: Omit<Approval, 'id' | 'company_id' | 'created_at' | 'decided_at' | 'status' | 'approved_by'>,
): Promise<Approval> {
  await ensureSeeded();
  const row: Approval = {
    ...input,
    id: id('apr'),
    company_id: COMPANY_ID,
    status: 'pending',
    approved_by: null,
    created_at: new Date().toISOString(),
    decided_at: null,
  };
  return driver().insertApproval(row);
}

export async function decideApproval(
  approvalId: string,
  status: 'approved' | 'declined',
  approvedBy: string,
): Promise<Approval | null> {
  await ensureSeeded();
  return driver().updateApproval(approvalId, {
    status,
    approved_by: approvedBy,
    decided_at: new Date().toISOString(),
  });
}

export interface RecordPurchaseInput {
  vendor: string;
  vendorSlug: string;
  category: string;
  product: string;
  price: number;
  currency: string;
  billingCycle: Purchase['billing_cycle'];
  trustScore: number | null;
  reasoning: string;
  monthlySaving?: number;
  approvalId?: string;
  /** Prava session/order identifiers, when a real payment ran. */
  sessionId: string;
  orderId?: string | null;
  txnRefId?: string | null;
  cardLast4?: string | null;
  simulated: boolean;
}

export interface RecordPurchaseResult {
  purchase: Purchase;
  subscription: Subscription | null;
  invoice: Invoice;
  transaction: Transaction;
}

/**
 * The single write that closes a procurement loop: purchase record,
 * subscription with its next payment date, invoice and transaction.
 */
export async function recordPurchase(input: RecordPurchaseInput): Promise<RecordPurchaseResult> {
  await ensureSeeded();

  const now = new Date();
  const purchaseId = id('pur');
  const invoiceId = id('inv');

  const renewalDate =
    input.billingCycle === 'one_time'
      ? null
      : addMonths(now, input.billingCycle === 'annual' ? 12 : 1).toISOString();

  const purchase: Purchase = {
    id: purchaseId,
    company_id: COMPANY_ID,
    vendor: input.vendor,
    vendor_slug: input.vendorSlug,
    category: input.category,
    product: input.product,
    price: input.price,
    currency: input.currency,
    billing_cycle: input.billingCycle,
    renewal_date: renewalDate,
    status: 'active',
    invoice_url: `/api/invoices/${invoiceId}`,
    transaction_id: null,
    card_last4: input.cardLast4 ?? null,
    trust_score: input.trustScore,
    monthly_saving:
      input.monthlySaving && input.monthlySaving > 0 ? round2(input.monthlySaving) : null,
    reasoning: input.reasoning,
    created_at: now.toISOString(),
  };

  const transaction: Transaction = {
    id: id('txn'),
    company_id: COMPANY_ID,
    purchase_id: purchaseId,
    approval_id: input.approvalId ?? null,
    session_id: input.sessionId,
    order_id: input.orderId ?? null,
    txn_ref_id: input.txnRefId ?? null,
    amount: input.price,
    currency: input.currency,
    status: 'completed',
    provider: input.simulated ? 'prava_simulated' : 'prava',
    created_at: now.toISOString(),
  };
  purchase.transaction_id = transaction.id;

  const invoice: Invoice = {
    id: invoiceId,
    company_id: COMPANY_ID,
    purchase_id: purchaseId,
    number: `OPS-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    amount: input.price,
    currency: input.currency,
    url: `/api/invoices/${invoiceId}`,
    issued_at: now.toISOString(),
  };

  const savedPurchase = await driver().insertPurchase(purchase);
  await driver().insertTransaction(transaction);
  await driver().insertInvoice(invoice);

  let subscription: Subscription | null = null;
  if (renewalDate) {
    subscription = await driver().insertSubscription({
      id: id('sub'),
      company_id: COMPANY_ID,
      purchase_id: purchaseId,
      vendor: input.vendor,
      vendor_slug: input.vendorSlug,
      plan: input.product,
      price: input.price,
      currency: input.currency,
      billing_cycle: input.billingCycle,
      next_payment: renewalDate,
      status: 'active',
      created_at: now.toISOString(),
    });
  }

  return { purchase: savedPurchase, subscription, invoice, transaction };
}

export async function renewSubscription(subscriptionId: string): Promise<Subscription | null> {
  await ensureSeeded();
  const db = await readDB();
  const sub = db.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub) return null;

  // Roll forward from the later of the current date and the due date, so a
  // renewal that is a week overdue still lands one full cycle from today.
  const base = new Date(Math.max(Date.now(), new Date(sub.next_payment).getTime()));
  const next = addMonths(base, sub.billing_cycle === 'annual' ? 12 : 1).toISOString();

  const updated = await driver().updateSubscription(subscriptionId, {
    next_payment: next,
    status: 'active',
  });
  if (updated) await driver().updatePurchase(sub.purchase_id, { renewal_date: next });
  return updated;
}

export async function cancelSubscription(subscriptionId: string): Promise<Subscription | null> {
  await ensureSeeded();
  const db = await readDB();
  const sub = db.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub) return null;

  const updated = await driver().updateSubscription(subscriptionId, { status: 'cancelled' });
  if (updated) await driver().updatePurchase(sub.purchase_id, { status: 'cancelled' });
  return updated;
}

export async function downgradeSubscription(
  subscriptionId: string,
  plan: string,
  price: number,
): Promise<Subscription | null> {
  await ensureSeeded();
  const db = await readDB();
  const sub = db.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub) return null;

  // Stays `active` — a downgrade changes what you pay for, not whether the
  // subscription counts toward monthly spend.
  const updated = await driver().updateSubscription(subscriptionId, { plan, price });
  if (updated) await driver().updatePurchase(sub.purchase_id, { product: plan, price });
  return updated;
}

export async function resetToSeed(): Promise<void> {
  await driver().reset(buildSeed());
  globalRef.__opspilotSeeding = Promise.resolve();
}
