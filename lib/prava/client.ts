import 'server-only';

// ─────────────────────────────────────────────────────────────
// Prava — payment stack for AI agents.
//
// Flow (see docs.prava.space):
//   1. server  POST /v1/sessions                     → session_token, iframe_url
//   2. browser mounts the PCI iframe with the token  → user approves with a passkey
//   3. server  GET  /v1/sessions/{id}/payment-result → network token + dynamic CVV
//   4. server  POST /v1/sessions/{id}/report-status  → APPROVED / DECLINED (required)
//
// Without MERCHANT_SECRET_KEY the module runs in simulated mode: the same
// shapes, the same state machine, no network. That keeps the demo runnable
// before keys are issued — every response carries `simulated: true` so the
// UI can label it honestly instead of pretending a card was charged.
// ─────────────────────────────────────────────────────────────

export interface PravaSession {
  session_id: string;
  session_token: string;
  expires_at: string;
  iframe_url: string;
  order_id: string;
  simulated: boolean;
}

export interface PravaLineItem {
  txn_ref_id: string;
  merchant_name: string;
  merchant_url: string;
  total_amount: string;
  status: string;
  token: string | null;
  dynamic_cvv: string | null;
  expiry_month: string | null;
  expiry_year: string | null;
  products: {
    product_ref_id: string;
    external_product_id: string | null;
    name: string;
    unit_price: string;
    quantity: number;
  }[];
}

export interface PravaTransaction {
  txn_id: string;
  status: 'pending' | 'awaiting_result' | 'completed' | 'failed' | string;
  line_items: PravaLineItem[];
  error?: { code: string; message: string };
}

export interface PravaPaymentResult {
  session_id: string;
  order_id: string | null;
  status: 'pending' | 'awaiting_result' | 'completed' | 'failed' | string;
  transactions: PravaTransaction[];
  simulated: boolean;
}

export interface CreateSessionInput {
  userId: string;
  userEmail: string;
  amount: number;
  currency?: string;
  description: string;
  merchant: {
    name: string;
    url: string;
    countryCode: string;
    mcc?: string;
    category?: string;
  };
  product: { description: string; unitPrice: number; quantity?: number };
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_PRAVA_BACKEND_URL || 'https://sandbox.api.prava.space';

export function pravaConfigured() {
  const key = process.env.MERCHANT_SECRET_KEY;
  return Boolean(key && !key.includes('YOUR_SECRET_KEY'));
}

export function pravaMode(): 'live' | 'sandbox' | 'simulated' {
  if (!pravaConfigured()) return 'simulated';
  return process.env.MERCHANT_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'sandbox';
}

function secretKey(): string {
  const key = process.env.MERCHANT_SECRET_KEY;
  if (!key) throw new Error('MERCHANT_SECRET_KEY is not configured');
  return key;
}

function money(n: number) {
  return n.toFixed(2);
}

// ── 1. Create session ────────────────────────────────────────

export async function createSession(input: CreateSessionInput): Promise<PravaSession> {
  if (!pravaConfigured()) return simulateSession(input);

  const res = await fetch(`${BACKEND_URL}/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey()}`,
    },
    cache: 'no-store',
    body: JSON.stringify({
      user_id: input.userId,
      user_email: input.userEmail,
      total_amount: money(input.amount),
      currency: input.currency ?? 'USD',
      description: input.description,
      purchase_context: [
        {
          // The DESTINATION merchant — the SaaS vendor the founder is buying
          // from, not OpsPilot. This name is what renders on the checkout
          // page and what reaches the card network as merchant of record.
          merchant_details: {
            name: input.merchant.name,
            url: input.merchant.url,
            country_code_iso2: input.merchant.countryCode,
            ...(input.merchant.mcc && { category_code: input.merchant.mcc }),
            ...(input.merchant.category && { category: input.merchant.category }),
          },
          product_details: [
            {
              description: input.product.description,
              unit_price: money(input.product.unitPrice),
              quantity: input.product.quantity ?? 1,
            },
          ],
          effective_until_minutes: 15,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error?.message || `Prava session failed (HTTP ${res.status})`,
    );
  }

  const session = (await res.json()) as Omit<PravaSession, 'simulated'>;
  return { ...session, simulated: false };
}

// ── 2. Poll payment result ───────────────────────────────────

export async function getPaymentResult(sessionId: string): Promise<PravaPaymentResult> {
  if (!pravaConfigured()) return simulateResult(sessionId);

  // Next.js will happily dedupe identical fetches; a poll must not be cached.
  const res = await fetch(
    `${BACKEND_URL}/v1/sessions/${sessionId}/payment-result?_t=${Date.now()}`,
    {
      headers: { Authorization: `Bearer ${secretKey()}` },
      cache: 'no-store',
      next: { revalidate: 0 },
    },
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error('Prava session not found');
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `Prava poll failed (HTTP ${res.status})`);
  }

  const result = (await res.json()) as Omit<PravaPaymentResult, 'simulated'>;
  return { ...result, simulated: false };
}

// ── 3. Report outcome (required) ─────────────────────────────

export async function reportStatus(
  sessionId: string,
  txnRefId: string,
  status: 'APPROVED' | 'DECLINED',
  authorizationCode?: string,
): Promise<boolean> {
  if (!pravaConfigured()) return true;

  const res = await fetch(`${BACKEND_URL}/v1/sessions/${sessionId}/report-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey()}`,
    },
    cache: 'no-store',
    body: JSON.stringify({
      txn_ref_id: txnRefId,
      txn_status: status,
      ...(authorizationCode && { authorization_code: authorizationCode }),
    }),
  });

  return res.ok;
}

export async function health(): Promise<boolean> {
  if (!pravaConfigured()) return true;
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Simulated mode ───────────────────────────────────────────
//
// Mirrors the real state machine: `pending` for a beat, then `completed`.
// Nothing is charged and no card data is involved.

interface SimulatedSession {
  createdAt: number;
  input: CreateSessionInput;
  orderId: string;
}

// Held on globalThis, not in module scope: each Next.js route handler gets its
// own module instance, so a plain module-level Map would mean the session
// created by /api/approvals/[id] is invisible to /api/prava/result. It also
// survives HMR.
const globalRef = globalThis as typeof globalThis & {
  __pravaSimulatedSessions?: Map<string, SimulatedSession>;
};

function simulatedSessions(): Map<string, SimulatedSession> {
  globalRef.__pravaSimulatedSessions ??= new Map();
  return globalRef.__pravaSimulatedSessions;
}

/** Time the fake session stays `pending`, so the polling UI is exercised. */
const SIMULATED_SETTLE_MS = 2_600;

function rand(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}

function simulateSession(input: CreateSessionInput): PravaSession {
  const sessionId = `sess_sim_${Math.random().toString(36).slice(2, 12)}`;
  const orderId = `ord_sim_${Math.random().toString(36).slice(2, 12)}`;
  simulatedSessions().set(sessionId, { createdAt: Date.now(), input, orderId });

  return {
    session_id: sessionId,
    session_token: `simtok_${Math.random().toString(36).slice(2)}`,
    order_id: orderId,
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    // Rendered by the app itself instead of Prava's PCI iframe.
    iframe_url: `/simulated-checkout?session=${sessionId}`,
    simulated: true,
  };
}

function simulateResult(sessionId: string): PravaPaymentResult {
  const entry = simulatedSessions().get(sessionId);

  if (!entry) {
    return {
      session_id: sessionId,
      order_id: null,
      status: 'failed',
      transactions: [
        {
          txn_id: `txn_sim_${sessionId.slice(-6)}`,
          status: 'failed',
          line_items: [],
          error: { code: 'SESSION_NOT_FOUND', message: 'Simulated session expired' },
        },
      ],
      simulated: true,
    };
  }

  const settled = Date.now() - entry.createdAt >= SIMULATED_SETTLE_MS;
  const { input } = entry;

  if (!settled) {
    return {
      session_id: sessionId,
      order_id: entry.orderId,
      status: 'pending',
      transactions: [],
      simulated: true,
    };
  }

  return {
    session_id: sessionId,
    order_id: entry.orderId,
    status: 'completed',
    transactions: [
      {
        txn_id: `txn_sim_${sessionId.slice(-8)}`,
        status: 'completed',
        line_items: [
          {
            txn_ref_id: `tli_sim_${sessionId.slice(-8)}`,
            merchant_name: input.merchant.name,
            merchant_url: input.merchant.url,
            total_amount: money(input.amount),
            status: 'completed',
            token: `4323${rand(12)}`,
            dynamic_cvv: rand(3),
            expiry_month: '12',
            expiry_year: String(new Date().getFullYear() + 2),
            products: [
              {
                product_ref_id: `ref_sim_${sessionId.slice(-6)}`,
                external_product_id: null,
                name: input.product.description,
                unit_price: money(input.product.unitPrice),
                quantity: input.product.quantity ?? 1,
              },
            ],
          },
        ],
      },
    ],
    simulated: true,
  };
}
