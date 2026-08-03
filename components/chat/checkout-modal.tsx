'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Spinner, VendorMark } from '@/components/ui/primitives';
import type { Approval, Purchase } from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';

export interface CheckoutSession {
  session_id: string;
  session_token: string;
  iframe_url: string;
  order_id: string;
  expires_at: string;
  simulated: boolean;
}

export interface CheckoutReceipt {
  transactionId: string;
  orderId: string | null;
  merchant: string;
  amount: string;
  tokenLast4: string | null;
  expiry: string | null;
}

type Phase = 'card' | 'settling' | 'done' | 'failed';

/** How often we ask our server for the Prava payment result. */
const POLL_MS = 2_500;

export function CheckoutModal({
  approval,
  session,
  publishableKey,
  vendorInitials,
  vendorColor,
  onComplete,
  onClose,
}: {
  approval: Approval;
  session: CheckoutSession;
  publishableKey: string | null;
  vendorInitials: string;
  vendorColor: string;
  onComplete: (purchase: Purchase, receipt: CheckoutReceipt) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('card');
  const [error, setError] = useState<string | null>(null);
  const [sdkFallback, setSdkFallback] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<{ destroy: () => void } | null>(null);
  const mounted = useRef(false);
  const settled = useRef(false);

  // ── Mount Prava's PCI iframe ───────────────────────────────
  // The SDK is loaded lazily: it is browser-only, and a bare iframe on the
  // session URL is a supported fallback if the module fails to load.
  useEffect(() => {
    if (session.simulated || mounted.current || !publishableKey) return;
    mounted.current = true;

    let cancelled = false;

    (async () => {
      try {
        const { PravaSDK } = await import('@prava-sdk/core');
        if (cancelled || !containerRef.current) return;

        const sdk = new PravaSDK({ publishableKey });
        sdkRef.current = sdk;

        await sdk.collectPAN({
          sessionToken: session.session_token,
          iframeUrl: session.iframe_url,
          container: containerRef.current,
          onError: (err: { message?: string }) =>
            setError(err.message ?? 'The card form reported an error.'),
        });
      } catch {
        // Module missing or blocked — fall back to the raw iframe URL, which
        // already carries the session token.
        if (!cancelled) setSdkFallback(true);
      }
    })();

    return () => {
      cancelled = true;
      sdkRef.current?.destroy();
      sdkRef.current = null;
      mounted.current = false;
    };
  }, [session, publishableKey]);

  // ── Poll for the payment result ────────────────────────────
  const poll = useCallback(async () => {
    if (settled.current) return;

    try {
      const res = await fetch('/api/prava/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.session_id,
          approvalId: approval.id,
          approval,
        }),
      });
      const data = await res.json();

      if (data.status === 'completed' && data.purchase) {
        settled.current = true;
        setPhase('done');
        onComplete(data.purchase, data.receipt);
        return;
      }

      if (data.status === 'failed') {
        settled.current = true;
        setPhase('failed');
        setError(data.message ?? 'The payment was declined.');
      }
    } catch {
      // Transient network error — the next tick tries again.
    }
  }, [approval, session.session_id, onComplete]);

  useEffect(() => {
    if (phase !== 'settling') return;
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [phase, poll]);

  // The real flow can complete inside the iframe at any moment, so poll from
  // the start; the simulated flow waits for the explicit authorize click.
  useEffect(() => {
    if (!session.simulated && phase === 'card') setPhase('settling');
  }, [session.simulated, phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'settling') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  const busy = phase === 'settling';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Pay ${approval.vendor}`}
    >
      <div className="animate-rise flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <VendorMark initials={vendorInitials} color={vendorColor} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold tracking-tight">
              {approval.vendor} {approval.plan}
            </p>
            <p className="text-[13px] text-ink-3">
              {formatMoney(approval.price, approval.currency)} ·{' '}
              {approval.billing_cycle === 'annual'
                ? 'billed yearly'
                : approval.billing_cycle === 'one_time'
                  ? 'one-time'
                  : 'billed monthly'}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-3">
            {session.simulated ? 'Prava · simulated' : 'Prava · secure'}
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-5 py-5">
          {phase === 'done' ? (
            <Success approval={approval} />
          ) : phase === 'failed' ? (
            <Failure message={error} />
          ) : session.simulated ? (
            <SimulatedCard busy={busy} />
          ) : sdkFallback || !publishableKey ? (
            <iframe
              src={session.iframe_url}
              title="Prava secure checkout"
              className="h-[420px] w-full rounded-xl border border-line"
              allow="publickey-credentials-get *; payment *"
            />
          ) : (
            <div
              ref={containerRef}
              className="min-h-[420px] overflow-hidden rounded-xl border border-line"
            />
          )}

          {error && phase !== 'failed' && (
            <p className="mt-3 rounded-lg border border-bad/20 bg-bad-soft px-3 py-2 text-[13px] text-bad">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-line px-5 py-4">
          {phase === 'done' ? (
            <Button className="flex-1" onClick={onClose}>
              Done
            </Button>
          ) : phase === 'failed' ? (
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              {session.simulated ? (
                <Button className="flex-1" onClick={() => setPhase('settling')} disabled={busy}>
                  {busy ? (
                    <>
                      <Spinner /> Authorising…
                    </>
                  ) : (
                    <>Authorise {formatMoney(approval.price, approval.currency)}</>
                  )}
                </Button>
              ) : (
                <span className="flex flex-1 items-center justify-center gap-2 text-[13px] text-ink-3">
                  <Spinner /> Waiting for your passkey…
                </span>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

// ── Sub-views ────────────────────────────────────────────────

function SimulatedCard({ busy }: { busy: boolean }) {
  return (
    <div className="space-y-4">
      <div className="relative aspect-[1.6] w-full overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-ink to-accent-ink p-5 text-white shadow-lg">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-medium opacity-80">Prava network token</span>
            <span className="text-[11px] uppercase tracking-widest opacity-70">Single use</span>
          </div>
          <div>
            <div className="font-mono text-lg tracking-[0.18em]">
              {busy ? '4323 •••• •••• ••••' : '•••• •••• •••• ••••'}
            </div>
            <div className="mt-2 flex gap-6 font-mono text-[11px] opacity-75">
              <span>EXP {busy ? '12/28' : '••/••'}</span>
              <span>CVV {busy ? '•••' : '•••'}</span>
            </div>
          </div>
        </div>
        {busy && <div className="shimmer absolute inset-0" aria-hidden />}
      </div>

      <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
        <p className="text-[13px] font-medium text-ink">
          Simulated checkout — no card is charged.
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
          Set <code className="font-mono text-[11.5px]">MERCHANT_SECRET_KEY</code> and{' '}
          <code className="font-mono text-[11.5px]">NEXT_PUBLIC_PUBLISHABLE_KEY</code> in
          <code className="font-mono text-[11.5px]"> .env.local</code> to run the real Prava
          flow: PCI card form, device binding and a passkey prompt.
        </p>
      </div>
    </div>
  );
}

function Success({ approval }: { approval: Approval }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="animate-pop mb-4 flex size-14 items-center justify-center rounded-full bg-good-soft text-good">
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="text-lg font-semibold tracking-tight">Purchase complete</p>
      <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-3">
        {approval.vendor} {approval.plan} is paid for. The receipt and renewal are in your
        dashboard.
      </p>
    </div>
  );
}

function Failure({ message }: { message: string | null }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className={cn('mb-4 flex size-14 items-center justify-center rounded-full bg-bad-soft text-bad')}>
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          <path
            d="M7 7l10 10M17 7L7 17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <p className="text-lg font-semibold tracking-tight">Payment didn&rsquo;t go through</p>
      <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-3">
        {message ?? 'Prava declined the transaction. Nothing was charged.'}
      </p>
    </div>
  );
}
