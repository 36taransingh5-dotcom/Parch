'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApprovalCard } from '@/components/chat/approval-card';
import {
  CheckoutModal,
  type CheckoutReceipt,
  type CheckoutSession,
} from '@/components/chat/checkout-modal';
import { PurchaseCard } from '@/components/chat/purchase-card';
import { ToolCard } from '@/components/chat/tool-card';
import { Markdown } from '@/components/ui/markdown';
import { Button, Spinner } from '@/components/ui/primitives';
import { getVendor } from '@/lib/catalog/vendors';
import type {
  Approval,
  ChatMessage,
  Purchase,
  Recommendation,
  StreamEvent,
  WireMessage,
} from '@/lib/types';
import { cn, id } from '@/lib/utils';

const SUGGESTIONS = [
  'Buy an email provider for our startup under $40/month.',
  "We're hiring a developer — get them the best AI code assistant under $25/month.",
  'We need error monitoring for production. Budget $30/month.',
  'Find us a password manager for 6 people.',
];

type ApprovalState = 'pending' | 'working' | 'approved' | 'declined';

interface CheckoutContext {
  approval: Approval;
  session: CheckoutSession;
  publishableKey: string | null;
}

export function ChatPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalStates, setApprovalStates] = useState<Record<string, ApprovalState>>({});
  const [checkout, setCheckout] = useState<CheckoutContext | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinnedToBottom = useRef(true);
  const autoSent = useRef(false);

  // Follow the stream, but stop fighting the user if they scroll up to read.
  // Only an *upward* scroll unpins: our own auto-scroll fires scroll events
  // too, and a distance-from-bottom check would let them unpin themselves
  // mid-animation.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let lastTop = el.scrollTop;
    const onScroll = () => {
      const top = el.scrollTop;
      if (top < lastTop - 4) pinnedToBottom.current = false;
      if (el.scrollHeight - top - el.clientHeight < 24) pinnedToBottom.current = true;
      lastTop = top;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!pinnedToBottom.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, checkout]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || streaming) return;

      setError(null);
      setInput('');
      pinnedToBottom.current = true;

      const userMessage: ChatMessage = {
        id: id('msg'),
        role: 'user',
        content,
        createdAt: Date.now(),
      };
      const assistantId = id('msg');

      // Snapshot history *before* this turn for the wire payload.
      let history: WireMessage[] = [];
      setMessages((prev) => {
        history = prev.map((m) => ({ role: m.role, content: m.content }));
        return [
          ...prev,
          userMessage,
          { id: assistantId, role: 'assistant', content: '', calls: [], createdAt: Date.now() },
        ];
      });

      setStreaming(true);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...history, { role: 'user', content }] }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`The agent is unreachable (HTTP ${res.status}).`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const line = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }

            switch (event.type) {
              case 'text_delta':
                patch((m) => ({ ...m, content: m.content + event.text }));
                break;

              case 'tool_start':
                patch((m) => ({ ...m, calls: [...(m.calls ?? []), event.call] }));
                break;

              case 'tool_end':
                patch((m) => ({
                  ...m,
                  calls: (m.calls ?? []).map((c) => (c.id === event.call.id ? event.call : c)),
                }));
                break;

              case 'approval':
                patch((m) => ({
                  ...m,
                  approval: event.approval,
                  recommendation: event.recommendation,
                }));
                setApprovalStates((prev) => ({ ...prev, [event.approval.id]: 'pending' }));
                break;

              case 'error':
                setError(event.message);
                break;

              case 'done':
                break;
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setStreaming(false);
        inputRef.current?.focus();
      }
    },
    [streaming],
  );

  // Deep link from the landing page: /chat?q=...
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !autoSent.current) {
      autoSent.current = true;
      router.replace('/chat');
      void send(q);
    }
  }, [searchParams, router, send]);

  // ── Approval → Prava ──────────────────────────────────────

  const approve = useCallback(async (approval: Approval) => {
    setApprovalStates((prev) => ({ ...prev, [approval.id]: 'working' }));
    setError(null);

    try {
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve', approval }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Could not open checkout.');

      setCheckout({
        approval,
        session: data.session as CheckoutSession,
        publishableKey: data.publishableKey ?? null,
      });
    } catch (err) {
      setApprovalStates((prev) => ({ ...prev, [approval.id]: 'pending' }));
      setError(err instanceof Error ? err.message : 'Could not open checkout.');
    }
  }, []);

  const decline = useCallback(async (approval: Approval) => {
    setApprovalStates((prev) => ({ ...prev, [approval.id]: 'declined' }));
    await fetch(`/api/approvals/${approval.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'decline', approval }),
    }).catch(() => undefined);

    setMessages((prev) => [
      ...prev,
      {
        id: id('msg'),
        role: 'assistant',
        content: "Cancelled — nothing was purchased. Tell me what to change and I'll look again.",
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const onPurchaseComplete = useCallback(
    (approval: Approval, purchase: Purchase, receipt: CheckoutReceipt) => {
      setApprovalStates((prev) => ({ ...prev, [approval.id]: 'approved' }));
      setMessages((prev) => [
        ...prev,
        {
          id: id('msg'),
          role: 'assistant',
          content: `Done. **${purchase.vendor} ${purchase.product}** is live at ${
            purchase.currency === 'USD' ? '$' : ''
          }${purchase.price}${
            purchase.billing_cycle === 'annual' ? '/year' : purchase.billing_cycle === 'one_time' ? '' : '/month'
          }${
            purchase.renewal_date
              ? `, renewing ${new Date(purchase.renewal_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                })}`
              : ''
          }. I've filed the invoice and put the renewal on your dashboard.`,
          purchase,
          createdAt: Date.now(),
        },
      ]);
      // Server components on /dashboard and /purchases re-read the store.
      router.refresh();
      void receipt;
    },
    [router],
  );

  const empty = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col md:h-dvh">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto w-full max-w-3xl px-5 py-8">
          {empty ? (
            <Welcome onPick={send} />
          ) : (
            <div className="space-y-7">
              {messages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  approvalState={
                    message.approval ? (approvalStates[message.approval.id] ?? 'pending') : 'pending'
                  }
                  onApprove={approve}
                  onDecline={decline}
                />
              ))}
            </div>
          )}

          {error && (
            <p className="mt-6 rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-[13px] text-bad">
              {error}
            </p>
          )}

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      <div className="border-t border-line bg-surface/85 backdrop-blur">
        <form
          className="mx-auto flex w-full max-w-3xl items-end gap-2.5 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="What does the team need?"
            disabled={streaming}
            className={cn(
              'max-h-40 min-h-[46px] flex-1 resize-none rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px]',
              'placeholder:text-ink-3 focus-visible:border-accent focus-visible:outline-none disabled:opacity-60',
            )}
          />
          <Button type="submit" disabled={streaming || !input.trim()} className="h-[46px] px-5">
            {streaming ? <Spinner /> : 'Send'}
          </Button>
        </form>
        <p className="pb-3 text-center text-[11.5px] text-ink-3">
          Parch never pays without your approval.
        </p>
      </div>

      {checkout && (
        <CheckoutModal
          approval={checkout.approval}
          session={checkout.session}
          publishableKey={checkout.publishableKey}
          vendorInitials={getVendor(checkout.approval.vendor_slug)?.initials ?? '··'}
          vendorColor={getVendor(checkout.approval.vendor_slug)?.brandColor ?? '#1F2937'}
          onComplete={(purchase, receipt) => onPurchaseComplete(checkout.approval, purchase, receipt)}
          onClose={() => setCheckout(null)}
        />
      )}
    </div>
  );
}

// ── Message ──────────────────────────────────────────────────

function MessageRow({
  message,
  approvalState,
  onApprove,
  onDecline,
}: {
  message: ChatMessage;
  approvalState: ApprovalState;
  onApprove: (approval: Approval) => void;
  onDecline: (approval: Approval) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-white">
          {message.content}
        </p>
      </div>
    );
  }

  const vendor = message.approval ? getVendor(message.approval.vendor_slug) : undefined;
  const purchaseVendor = message.purchase ? getVendor(message.purchase.vendor_slug) : undefined;

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
          <path
            d="M10 2.5l6.5 4v7l-6.5 4-6.5-4v-7l6.5-4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="2.1" fill="currentColor" />
        </svg>
      </span>

      <div className="min-w-0 flex-1 space-y-3">
        {message.calls && message.calls.length > 0 && (
          <div className="space-y-1.5">
            {message.calls.map((call) => (
              <ToolCard key={call.id} call={call} />
            ))}
          </div>
        )}

        {message.content && <Markdown text={message.content} />}

        {message.approval && (
          <ApprovalCard
            approval={message.approval}
            recommendation={message.recommendation as Recommendation | undefined}
            vendorInitials={vendor?.initials ?? '··'}
            vendorColor={vendor?.brandColor ?? '#1F2937'}
            state={approvalState}
            onApprove={() => onApprove(message.approval!)}
            onDecline={() => onDecline(message.approval!)}
          />
        )}

        {message.purchase && (
          <PurchaseCard
            purchase={message.purchase}
            vendorInitials={purchaseVendor?.initials ?? '··'}
            vendorColor={purchaseVendor?.brandColor ?? '#1F2937'}
          />
        )}
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="animate-rise py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
        What does the team need?
      </h1>
      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-2">
        Name the category and the ceiling. I&rsquo;ll research the market, verify the merchant and
        come back with one recommendation to approve.
      </p>

      <div className="mt-7 grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-xl border border-line bg-surface px-4 py-3.5 text-left text-[14px] leading-snug text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
