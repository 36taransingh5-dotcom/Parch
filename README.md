# Parch

**Your AI procurement employee.** Tell it what the team needs and what you'll spend. It researches
the market, verifies the merchant, defends a recommendation — and once you approve, it actually
buys the thing through [Prava](https://prava.space).

**Live: [parch-eta.vercel.app](https://parch-eta.vercel.app/)**

<p>
  <img alt="Next.js 15" src="https://img.shields.io/badge/Next.js-15-black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
  <img alt="Tailwind CSS v4" src="https://img.shields.io/badge/Tailwind-v4-38bdf8">
  <img alt="Zero-config" src="https://img.shields.io/badge/setup-zero--config-22c55e">
</p>

---

## Run it

Try the [live deployment](https://parch-eta.vercel.app/) first — no install needed.

To run it yourself:

```bash
npm install && npm run dev
```

Open <http://localhost:3000>. **No configuration required.** With an empty environment the app
boots into demo mode — a deterministic agent, a file-backed store, simulated Prava payments and a
local trust model — and the entire procurement workflow runs end to end.

Add keys to light up the real integrations one at a time (see [Configuration](#configuration)).

---

## Example

Ask it something like *"Buy an email provider for our startup under $40/month"* in **Chat**, and
here's what happens:

1. Tool cards land in order — vendors found, pricing read, four merchants trust-checked, options
   compared. Click any card to expand the underlying data.
2. It gives a recommendation that names the one number that decided it and the trade-off it
   accepted, then stops and asks for approval.
3. Click **Approve & pay**. Prava opens a checkout session for exactly that amount.
4. Authorise. The payment settles, the outcome is reported back to Prava, and a receipt appears
   inline with the transaction ID and the last four of the network token.
5. **Dashboard**, **Purchases** and **Renewals** all pick up the purchase, invoice and next payment
   date immediately.

It handles other categories the same way — an AI code assistant under a per-seat budget, a
password manager for a specific headcount (correctly weighing 1Password's flat starter pack
against per-seat pricing), error monitoring under a monthly cap, and so on.

`Settings` has a one-click reset back to the seed data if you want a clean slate.

---

## The one design decision that matters

**The agent has no payment tool.**

It can search, price, compare, verify and *request* approval. That's the whole tool belt. There is
no function it can call that moves money.

The only path to a charge is a human clicking Approve in the browser, which hits
`POST /api/approvals/[id]` — a route the model cannot reach. That route opens the Prava session,
and the browser drives the PCI checkout from there. Every approval is also HMAC-signed
(`lib/approvals/proof.ts`) so it can't be replayed or edited in transit between client and server.

This means no prompt, no poisoned vendor page and no model mistake can result in a purchase. The
guarantee is structural, not a rule in a system prompt hoping to be obeyed. The same rule holds
even over text message — see [Linq](#linq-imessagesms-approvals-optional) below.

---

## How it works

```
User request
   ↓
searchVendors ─── category resolution, budget + seat extraction
   ↓
fetchPricing ──── published tiers per vendor (parallel)
   ↓
checkMerchantTrust ─ Senso, blended with a local signal model (parallel)
   ↓
compareOptions ── normalised to monthly cost, flagged against budget
   ↓
createRecommendation ─ pick, pros, honest cons, runner-up
   ↓
requestApproval ─ ⛔ agent stops here · approval is HMAC-signed · (optional) texted via Linq
   ↓
[HUMAN CLICKS APPROVE — in the app, or opens the app from a text reply]
   ↓
POST /v1/sessions ─────────────► Prava
   ↓
Browser mounts the PCI iframe · passkey approval
   ↓
GET /v1/sessions/{id}/payment-result ─► network token + dynamic CVV
   ↓
POST /v1/sessions/{id}/report-status ─► APPROVED
   ↓
Purchase · Subscription · Invoice · Transaction written
```

### Agent

Two interchangeable implementations behind one interface, both driving the same tools and emitting
the same stream events:

- **`lib/agent/openai.ts` + `run.ts`** — OpenAI Responses API with function calling and parallel
  tool calls, streamed over SSE. Used when `OPENAI_API_KEY` is set.
- **`lib/agent/scripted.ts`** — a deterministic agent that runs the identical workflow. Used when
  no key is set, *and* as an automatic rescue if the model call fails before producing output. The
  product shouldn't be one API outage away from a blank screen.

The Responses API is called over plain `fetch` rather than through the SDK, so an upstream SDK
bump can't silently break the agent loop.

### Trust scoring

`checkMerchantTrust` asks Senso when `SENSO_API_KEY` is present and **blends its answer 50/50 with
a local model** rather than replacing it. The local signals (years operating, published
certifications, public sentiment, customer scale, unresolved incidents) are things the UI can cite
back to the user, and blending keeps one flaky API call from swinging a purchase recommendation on
its own. Every component of the score traces to something shown in the expanded trust card.

Without a Senso key the local model answers alone, labelled as such in the UI.

### Vendor catalog

`lib/catalog/vendors.ts` — 23 vendors across 7 categories with published list prices, tiers,
strengths, trade-offs and trust signals.

The agent researches against this catalog rather than live-crawling pricing pages: a procurement
run needs to finish in a couple of minutes and produce the same result on repeat runs, not depend
on a scrape succeeding at request time. Prices carry a `capturedAt` date and the UI says so out
loud rather than implying a live quote.

### Persistence

`lib/store/` picks a driver at runtime — Supabase when configured, otherwise a JSON file in
`.data/`. The file driver serialises writes through a promise chain, because Next.js route handlers
run concurrently and a read-modify-write on one file is otherwise a lost update waiting to happen.
Both drivers implement the same `StoreDriver` interface.

### Payments (Prava)

`lib/prava/client.ts` wraps the three-call Prava flow — create session, poll `payment-result`,
`report-status` the outcome — and falls back to a fully simulated version of the same state machine
when no key is configured, so the checkout UI is exercised identically either way. Card data never
reaches this app: what comes back from a real session is a single-use Visa network token with a
dynamic CVV.

### Linq (iMessage/SMS approvals, optional)

When `LINQ_API_KEY`, `LINQ_FROM_NUMBER` and `LINQ_TO_NUMBER` are set, every approval request also
goes out as a text (`lib/linq/client.ts`) — vendor, price, reasoning, trust score. A **"NO"** reply
cancels the request outright; that's a safe status flip, handled by the webhook
(`app/api/linq/webhook/route.ts`).

A **"YES"** reply deliberately does *not* charge anything. Completing a Prava purchase requires a
WebAuthn passkey ceremony in a browser, which an inbound text can't satisfy — and shouldn't be able
to. "YES" gets a reply with a link back to the app instead. This is the same no-payment-tool
guarantee as the chat agent, extended to a second surface instead of weakened for it.

Fully optional — with these unset, no text is sent and the in-app approval card works exactly the
same.

---

## Configuration

Copy `.env.example` to `.env.local`. Every key is optional.

| Variable | Effect when set | Fallback when unset |
|---|---|---|
| `OPENAI_API_KEY` | Model reasons through the workflow | Deterministic scripted agent |
| `OPENAI_MODEL` | Model id (default `gpt-4.1`) | — |
| `MERCHANT_SECRET_KEY` | Real Prava sessions. **Server-side only** | Simulated checkout, nothing charged |
| `NEXT_PUBLIC_PUBLISHABLE_KEY` | Mounts the Prava PCI iframe | Simulated card sheet |
| `NEXT_PUBLIC_PRAVA_BACKEND_URL` | Prava host (default sandbox) | — |
| `SENSO_API_KEY` | Live merchant verification, blended in | Local trust model only |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Postgres persistence | `.data/parch.json` |
| `LINQ_API_KEY` + `LINQ_FROM_NUMBER` + `LINQ_TO_NUMBER` | Texts the founder every approval request | Approval card only, no text |
| `LINQ_WEBHOOK_SECRET` | Verifies inbound Linq replies are genuine | Skipped (fine locally, not for a real deployment) |
| `APPROVAL_SIGNING_SECRET` | HMAC key for approval integrity | Falls back to `MERCHANT_SECRET_KEY`, then `OPENAI_API_KEY`, then a fixed dev string |
| `DEMO_COMPANY_NAME`, `DEMO_USER_EMAIL` | Company and approver identity | Acme Inc. / founder@acme.dev |

`Settings` shows which mode each integration is in at a glance.

### Real Prava payments

1. Put `sk_test_…` in `MERCHANT_SECRET_KEY` and `pk_test_…` in `NEXT_PUBLIC_PUBLISHABLE_KEY`.
2. Restart the dev server.
3. Approve a purchase. The first run on a new browser triggers device binding — the sandbox test
   OTP is `456789` — then registers a passkey on the card network's hosted page. **Budget 2–3
   minutes for the first run**; repeat purchases on the same browser are one biometric prompt.
4. If you're testing locally, serve the app over real HTTPS once you get to the passkey step —
   some card-network verification steps refuse to run against a plain `http://localhost` origin. A
   quick tunnel (`cloudflared tunnel --url http://localhost:3000`, no account needed) is enough.
   The live Vercel deployment already runs on a real HTTPS domain, so this only matters locally.

Card data never touches this app. What comes back is a single-use Visa network token with a dynamic
CVV, and every outcome is reported to Prava with `report-status` — unreported checkouts stay stuck
in `awaiting_result`.

### Supabase

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

Then set the two Supabase variables. The driver switches over automatically.

### Linq

Set the three send-side variables to start texting approval requests. To handle replies, deploy
somewhere with a public HTTPS URL, then register the webhook once:

```bash
curl -X POST https://api.linqapp.com/api/partner/v3/webhook-subscriptions \
  -H "Authorization: Bearer $LINQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_url": "https://<your-domain>/api/linq/webhook?version=2026-02-03", "subscribed_events": ["message.received"]}'
```

---

## Deploy

Live at **[parch-eta.vercel.app](https://parch-eta.vercel.app/)**.

The app is a standard Next.js 15 project — deploys anywhere Next.js does. To deploy your own:

```bash
npm i -g vercel
vercel
```

Set the environment variables from `.env.example` in the Vercel project settings (all optional —
the app still runs in full demo mode with none of them set). Set `NEXT_PUBLIC_APP_URL` to your
deployed domain if you're using Linq — it's what gets sent in the "open the app" text reply.

If you're using the file-backed store, note that serverless filesystems are ephemeral per
invocation: point `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` at a real Postgres
instance for persistence that survives a redeploy.

---

## Layout

```
app/
  page.tsx                  landing
  (app)/                    dashboard · chat · purchases · renewals · settings
  api/
    chat/                   SSE agent stream
    approvals/[id]/         the human decision point → opens a Prava session
    prava/result/           poll · report-status · write the purchase
    renewals/               renew · cancel · downgrade
    invoices/[id]/          printable HTML invoice
    linq/webhook/           inbound iMessage/SMS replies
    status/  reset/         integration status · demo reset
components/
  chat/                     tool cards, comparison table, trust badge,
                            approval card, Prava checkout, purchase receipt
  dashboard/ renewals/ settings/ ui/
lib/
  agent/                    OpenAI Responses loop + scripted fallback
  tools/                    the six tools the agent can call
  prava/                    session · payment-result · report-status (+ simulator)
  senso/                    trust scoring
  linq/                     iMessage/SMS notifications
  approvals/                HMAC signing for approval integrity
  catalog/                  vendor knowledge base
  store/                    file + Supabase drivers behind one interface
supabase/schema.sql
```

---

## Known limits

- The live deployment runs on the file-backed store (no Supabase project wired up yet), so on
  Vercel's serverless filesystem a purchase made in one request isn't guaranteed to be visible on
  the next — the workflow itself still runs end to end, but persistence across requests is best
  demonstrated locally, or on Vercel once `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  are set.
- The vendor catalog is a fixed snapshot, not a live crawler. Prices are published list rates
  captured on the date shown in each pricing card.
- The scripted agent's ranking uses an editorial "fit" prior (`lib/agent/scripted.ts`) alongside
  trust and budget headroom. It's kept out of the vendor catalog on purpose — the catalog holds
  verifiable facts, that map holds a judgement call, and the LLM path ignores it entirely.
- No multi-tenancy or auth — single company, approvals recorded against `DEMO_USER_EMAIL`. Adding
  real auth and per-company scoping is the natural next step before this handles more than one team.
- Linq replies are matched to a pending approval by an in-memory map that resets on redeploy —
  fine for a single instance, would want a persisted mapping across processes at real scale.
- `npm audit` reports advisories in `postcss` and `sharp`, both transitive dependencies bundled
  inside Next.js itself. There is no fix short of downgrading Next to v9; the app pins the patched
  15.5.22.

---

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · OpenAI Responses API ·
[Prava](https://prava.space) for PCI-compliant payments · [Senso](https://senso.ai) for merchant
trust · [Linq](https://linqapp.com) for iMessage/SMS · Supabase (optional persistence)

---

Originally built at the Prava Hackathon 2026.
