import 'server-only';

import type { Approval, Recommendation } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Linq — iMessage/RCS/SMS notifications.
//
// docs.linqapp.com: base URL https://api.linqapp.com/api/partner/v3,
// Bearer auth. POST /chats creates a chat and sends the first message.
//
// SCOPE, deliberately: this sends the approval request as a text and
// reacts to a "NO" reply by actually cancelling it — that part is a plain
// status flip, safe to do from a webhook. It does NOT let a "YES" reply
// execute the payment. Completing a Prava purchase requires a WebAuthn
// passkey ceremony in a browser; there is no way to satisfy that from an
// inbound text message, and there shouldn't be — that's what keeps this
// app from spending money without a human physically present. A "YES"
// reply gets a link back to the app instead of a silent charge.
// ─────────────────────────────────────────────────────────────

const LINQ_BASE_URL = 'https://api.linqapp.com/api/partner/v3';
const LINQ_TIMEOUT_MS = 6_000;

export function linqConfigured() {
  return Boolean(
    process.env.LINQ_API_KEY && process.env.LINQ_FROM_NUMBER && process.env.LINQ_TO_NUMBER,
  );
}

export function linqWebhookConfigured() {
  return Boolean(process.env.LINQ_WEBHOOK_SECRET);
}

interface LinqChat {
  id: string;
  is_group: boolean;
  last_message: {
    id: string;
    parts: { type: string; value: string }[];
    sent_at: string;
    service: 'iMessage' | 'RCS' | 'SMS';
  };
}

async function send(to: string, text: string): Promise<LinqChat | null> {
  const apiKey = process.env.LINQ_API_KEY;
  const from = process.env.LINQ_FROM_NUMBER;
  if (!apiKey || !from) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINQ_TIMEOUT_MS);

  try {
    const res = await fetch(`${LINQ_BASE_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        from,
        to: [to],
        message: { parts: [{ type: 'text', value: text }] },
      }),
    });

    if (!res.ok) return null;
    return (await res.json()) as LinqChat;
  } catch {
    // Notification is a nice-to-have, never the thing that breaks a
    // procurement run — same posture as the Senso trust fallback.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Maps a Linq chat back to the approval it was sent for, so the webhook
// knows which pending approval a reply is about. In-memory on globalThis
// for the same reason as the Prava simulated-session map: each Next.js
// route handler is its own module instance, and this needs to survive
// across the send and the later webhook call, plus HMR in dev.
const globalRef = globalThis as typeof globalThis & {
  __linqChatToApproval?: Map<string, string>;
};

function chatMap(): Map<string, string> {
  globalRef.__linqChatToApproval ??= new Map();
  return globalRef.__linqChatToApproval;
}

export function approvalForChat(chatId: string): string | undefined {
  return chatMap().get(chatId);
}

/**
 * Texts the founder the recommendation and asks for a decision. Best-effort:
 * failures are swallowed so a missing/invalid Linq key never blocks the
 * approval card from showing in the app.
 */
export async function notifyApproval(
  approval: Approval,
  recommendation?: Recommendation,
): Promise<void> {
  const to = process.env.LINQ_TO_NUMBER;
  if (!to) return;

  const cycle =
    approval.billing_cycle === 'annual'
      ? '/yr'
      : approval.billing_cycle === 'one_time'
        ? ' one-time'
        : '/mo';

  const trust = recommendation?.trust ? ` Trust ${recommendation.trust.score}/100.` : '';

  const text = [
    `Parch: ${approval.vendor} ${approval.plan} — ${formatMoney(approval.price, approval.currency)}${cycle}.`,
    approval.reasoning,
    `${trust} Reply YES to review and approve with your passkey, NO to cancel.`,
  ]
    .filter(Boolean)
    .join(' ');

  const chat = await send(to, text);
  if (chat) chatMap().set(chat.id, approval.id);
}

export async function notifyDeclined(to: string, approval: Approval): Promise<void> {
  await send(to, `Cancelled — ${approval.vendor} ${approval.plan} was not purchased.`);
}

export async function notifyNeedsApp(to: string, approval: Approval): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await send(
    to,
    `Almost there — Prava needs your passkey to actually charge the card, and that only works in the app. Open ${appUrl}/chat to finish approving ${approval.vendor} ${approval.plan}.`,
  );
}
