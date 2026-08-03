import { Webhook } from 'standardwebhooks';
import { approvalForChat, notifyDeclined, notifyNeedsApp } from '@/lib/linq/client';
import { decideApproval, getApproval } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Inbound Linq messages (a founder replying to the approval text).
//
// Register this URL with Linq once you have a public HTTPS deployment:
//   POST https://api.linqapp.com/api/partner/v3/webhook-subscriptions
//   { "target_url": "https://<your-domain>/api/linq/webhook?version=2026-02-03",
//     "subscribed_events": ["message.received"] }
//
// Verified with the `standardwebhooks` package (Linq's SDK depends on it,
// so this is the same scheme they use) against LINQ_WEBHOOK_SECRET. Without
// that secret set, verification is skipped — fine for local testing where
// the payload can't have come from anywhere but your own curl command, not
// fine for a real deployment.
//
// "YES" only ever gets a reply pointing back to the app — see the scoping
// note in lib/linq/client.ts for why a text message can't complete a
// Prava purchase.
// ─────────────────────────────────────────────────────────────

interface InboundEvent {
  event_type?: string;
  data?: {
    chat_id?: string;
    from?: string;
    parts?: { type?: string; value?: string }[];
  };
}

const YES = /^\s*(yes|y|approve|ok|okay|👍|✅)\s*$/i;
const NO = /^\s*(no|n|cancel|decline|stop|👎)\s*$/i;

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.LINQ_WEBHOOK_SECRET;
  if (secret) {
    try {
      const wh = new Webhook(secret);
      wh.verify(raw, {
        'webhook-id': request.headers.get('webhook-id') ?? '',
        'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
        'webhook-signature': request.headers.get('webhook-signature') ?? '',
      });
    } catch {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: InboundEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (event.event_type !== 'message.received') {
    // Delivery/read receipts and reactions land here too — 2xx and ignore.
    return Response.json({ ok: true });
  }

  const chatId = event.data?.chat_id;
  const from = event.data?.from;
  const text = event.data?.parts?.find((p) => p.type === 'text')?.value ?? '';

  if (!chatId || !from) return Response.json({ ok: true });

  const approvalId = approvalForChat(chatId);
  if (!approvalId) return Response.json({ ok: true });

  const approval = await getApproval(approvalId);
  if (!approval || approval.status !== 'pending') return Response.json({ ok: true });

  if (NO.test(text)) {
    await decideApproval(approvalId, 'declined', from);
    await notifyDeclined(from, approval);
  } else if (YES.test(text)) {
    // Deliberately does not decide or charge anything from here — see the
    // module doc comment. The passkey step has to happen in the app.
    await notifyNeedsApp(from, approval);
  }
  // Anything else: no reply. Founders will text things that aren't yes/no.

  return Response.json({ ok: true });
}
