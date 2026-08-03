import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EMPTY_DB, type DB, type StoreDriver } from './types';

// On serverless hosts the project directory is read-only — /tmp is the only
// writable path. Data there is ephemeral, which is fine for a demo store;
// Supabase is the persistence story in production.
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'parch-data')
  : path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'parch.json');

/**
 * JSON-file driver. Chosen when Supabase is not configured so the app runs
 * with no setup at all, and so a demo survives a page refresh (and a dev
 * server restart) without anyone provisioning a database first.
 *
 * Writes are serialised through a promise chain — Next.js route handlers
 * run concurrently and a read-modify-write on a single file is otherwise
 * a lost-update waiting to happen.
 */
class FileDriver implements StoreDriver {
  readonly name = 'file' as const;
  private queue: Promise<unknown> = Promise.resolve();
  private cache: DB | null = null;

  private serialise<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    // Keep the chain alive even if one operation rejects.
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async load(): Promise<DB> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DB>;
      this.cache = { ...EMPTY_DB, ...parsed };
    } catch {
      this.cache = structuredClone(EMPTY_DB);
    }
    return this.cache;
  }

  private async persist(db: DB) {
    this.cache = db;
    // Best-effort: if the disk write fails (read-only filesystem), the
    // in-memory cache still serves this process — don't fail the request.
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch {
      // Memory-only mode.
    }
  }

  read(): Promise<DB> {
    return this.serialise(async () => structuredClone(await this.load()));
  }

  private insert<K extends keyof DB>(table: K, row: DB[K][number]) {
    return this.serialise(async () => {
      const db = await this.load();
      (db[table] as DB[K][number][]).unshift(row);
      await this.persist(db);
      return row;
    });
  }

  private update<K extends keyof DB>(
    table: K,
    id: string,
    patch: Partial<DB[K][number]>,
  ): Promise<DB[K][number] | null> {
    return this.serialise(async () => {
      const db = await this.load();
      const rows = db[table] as (DB[K][number] & { id: string })[];
      const index = rows.findIndex((r) => r.id === id);
      if (index === -1) return null;
      rows[index] = { ...rows[index], ...patch };
      await this.persist(db);
      return structuredClone(rows[index]);
    });
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

  reset(seed: DB): Promise<void> {
    return this.serialise(async () => {
      await this.persist(structuredClone(seed));
    });
  }
}

export function createFileDriver(): StoreDriver {
  return new FileDriver();
}
