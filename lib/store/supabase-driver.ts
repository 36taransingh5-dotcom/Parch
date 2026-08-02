import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EMPTY_DB, type DB, type StoreDriver } from './types';

/**
 * Supabase driver. Activated automatically when NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are both set. Table DDL lives in
 * supabase/schema.sql — run it once against a fresh project.
 *
 * Uses the service role key and only ever runs server-side, so RLS is
 * bypassed by design; this app has a single demo company.
 */
class SupabaseDriver implements StoreDriver {
  readonly name = 'supabase' as const;

  constructor(private client: SupabaseClient) {}

  async read(): Promise<DB> {
    const [purchases, subscriptions, approvals, transactions, invoices] = await Promise.all([
      this.client.from('purchases').select('*').order('created_at', { ascending: false }),
      this.client.from('subscriptions').select('*').order('next_payment', { ascending: true }),
      this.client.from('approvals').select('*').order('created_at', { ascending: false }),
      this.client.from('transactions').select('*').order('created_at', { ascending: false }),
      this.client.from('invoices').select('*').order('issued_at', { ascending: false }),
    ]);

    return {
      purchases: purchases.data ?? EMPTY_DB.purchases,
      subscriptions: subscriptions.data ?? EMPTY_DB.subscriptions,
      approvals: approvals.data ?? EMPTY_DB.approvals,
      transactions: transactions.data ?? EMPTY_DB.transactions,
      invoices: invoices.data ?? EMPTY_DB.invoices,
    } as DB;
  }

  // `never` casts: without generated database types the client's row
  // generics resolve to `any` and reject our concrete shapes. The domain
  // types on the public methods are what actually keep callers honest.
  private async insert<T>(table: string, row: T): Promise<T> {
    const { data, error } = await this.client
      .from(table)
      .insert(row as never)
      .select()
      .single();
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    return data as T;
  }

  private async update<T>(table: string, id: string, patch: Partial<T>): Promise<T | null> {
    const { data, error } = await this.client
      .from(table)
      .update(patch as never)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`${table} update failed: ${error.message}`);
    return (data as T) ?? null;
  }

  insertPurchase: StoreDriver['insertPurchase'] = (row) => this.insert('purchases', row);
  insertSubscription: StoreDriver['insertSubscription'] = (row) =>
    this.insert('subscriptions', row);
  insertApproval: StoreDriver['insertApproval'] = (row) => this.insert('approvals', row);
  insertTransaction: StoreDriver['insertTransaction'] = (row) => this.insert('transactions', row);
  insertInvoice: StoreDriver['insertInvoice'] = (row) => this.insert('invoices', row);

  updateApproval: StoreDriver['updateApproval'] = (id, patch) =>
    this.update('approvals', id, patch);
  updatePurchase: StoreDriver['updatePurchase'] = (id, patch) =>
    this.update('purchases', id, patch);
  updateSubscription: StoreDriver['updateSubscription'] = (id, patch) =>
    this.update('subscriptions', id, patch);
  updateTransaction: StoreDriver['updateTransaction'] = (id, patch) =>
    this.update('transactions', id, patch);

  async reset(seed: DB): Promise<void> {
    // Child rows first — invoices, transactions and subscriptions all point
    // at purchases.
    for (const table of ['invoices', 'transactions', 'subscriptions', 'approvals', 'purchases']) {
      await this.client.from(table).delete().neq('id', '__none__');
    }
    if (seed.purchases.length) await this.client.from('purchases').insert(seed.purchases);
    if (seed.subscriptions.length)
      await this.client.from('subscriptions').insert(seed.subscriptions);
    if (seed.approvals.length) await this.client.from('approvals').insert(seed.approvals);
    if (seed.transactions.length) await this.client.from('transactions').insert(seed.transactions);
    if (seed.invoices.length) await this.client.from('invoices').insert(seed.invoices);
  }
}

export function createSupabaseDriver(): StoreDriver | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseDriver(client);
}
