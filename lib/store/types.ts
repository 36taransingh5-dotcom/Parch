import type {
  Approval,
  Invoice,
  Purchase,
  Subscription,
  Transaction,
} from '@/lib/types';

export interface DB {
  purchases: Purchase[];
  subscriptions: Subscription[];
  approvals: Approval[];
  transactions: Transaction[];
  invoices: Invoice[];
}

export const EMPTY_DB: DB = {
  purchases: [],
  subscriptions: [],
  approvals: [],
  transactions: [],
  invoices: [],
};

/**
 * Every backend implements this. The file-backed driver is the default so
 * the app runs with zero configuration; Supabase takes over automatically
 * when its env vars are present.
 */
export interface StoreDriver {
  readonly name: 'file' | 'supabase';
  read(): Promise<DB>;
  insertPurchase(row: Purchase): Promise<Purchase>;
  insertSubscription(row: Subscription): Promise<Subscription>;
  insertApproval(row: Approval): Promise<Approval>;
  insertTransaction(row: Transaction): Promise<Transaction>;
  insertInvoice(row: Invoice): Promise<Invoice>;
  updateApproval(id: string, patch: Partial<Approval>): Promise<Approval | null>;
  updatePurchase(id: string, patch: Partial<Purchase>): Promise<Purchase | null>;
  updateSubscription(id: string, patch: Partial<Subscription>): Promise<Subscription | null>;
  updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction | null>;
  reset(seed: DB): Promise<void>;
}

export const COMPANY_ID = 'company_demo';
