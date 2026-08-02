# OpsPilot

**Your AI procurement employee.** Tell it what the team needs and what you'll spend. It researches
the market, verifies the merchant, defends a recommendation — and once you approve, it actually
buys the thing through [Prava](https://prava.space).

Built for the Prava Hackathon 2026.

---

## Run it

```bash
npm install && npm run dev
```

Open <http://localhost:3000>. **No configuration required.** With an empty environment the app
boots into demo mode — a deterministic agent, a file-backed store, simulated Prava payments and a
local trust model — and the entire procurement workflow runs end to end.

Add keys to light up the real integrations one at a time (see [Configuration](#configuration)).

---

## The demo, in 90 seconds

1. Go to **Chat** and ask: *"Buy an email provider for our startup under $40/month."*
2. Watch the tool cards land in order — vendors found, pricing read, four merchants trust-checked,
   options compared. Click any card to expand the underlying data.
3. Read the recommendation. It names the number that decided it and the trade-off it accepted.
4. Click **Approve & pay**. Prava opens a checkout session for exactly that amount.
5. Authorise. The payment settles, the outcome is reported back to Prava, and the receipt appears
   inline with the transaction ID and the last four of the network token.
6. Check **Dashboard**, **Purchases** and **Renewals** — the purchase, invoice and next payment
   date are all there.

Other prompts worth trying:

- *"We're hiring a developer — get them the best AI code assistant under $25/month."*
- *"Find us a password manager for 6 people."* — watch it price per-seat plans against 1Password's
  flat starter pack and pick correctly.
- *"We need error monitoring for production. Budget $30/month."*

`Settings → Reset demo data` puts everything back between runs.

---

## The one design decision that matters

**The agent has no payment tool.**

It can search, price, compare, verify and *request* approval. That's the whole tool belt. There is
no function it can call that moves money.

The only path to a charge is a human clicking Approve in the browser, which hits
`POST /api/approvals/[id]` — a route the model cannot reach. That route opens the Prava session,
and the browser drives the PCI checkout from there.

This means no prompt, no poisoned vendor page and no model mistake can result in a purchase. The
guarantee is structural, not a rule in a system prompt hoping to be obeyed.

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
requestApproval ─ ⛔ agent stops here
   ↓
[HUMAN CLICKS APPROVE]
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
  no key is set, *and* as an automatic rescue if the model call fails before producing output. A
  live demo should not be one API outage away from a blank screen.

The Responses API is called over plain `fetch` rather than through the SDK, so an SDK major bump
can't break the agent loop on demo morning.

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
run has to finish in under two minutes and produce the same result every time a judge runs it.
Prices carry a `capturedAt` date and the UI says so out loud rather than implying a live quote.

### Persistence

`lib/store/` picks a driver at runtime — Supabase when configured, otherwise a JSON file in
`.data/`. The file driver serialises writes through a promise chain, because Next.js route handlers
run concurrently and a read-modify-write on one file is otherwise a lost update waiting to happen.
Both drivers implement the same `StoreDriver` interface.

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
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Postgres persistence | `.data/opspilot.json` |
| `DEMO_COMPANY_NAME`, `DEMO_USER_EMAIL` | Company and approver identity | Acme Inc. / founder@acme.dev |

`Settings` shows which mode each integration is in at a glance.

### Real Prava payments

1. Put `sk_test_…` in `MERCHANT_SECRET_KEY` and `pk_test_…` in `NEXT_PUBLIC_PUBLISHABLE_KEY`.
2. Restart the dev server.
3. Approve a purchase. The first run on a new browser triggers device binding — the sandbox test
   OTP is `456789` — then registers a passkey on the card network's hosted page. **Budget 2–3
   minutes for the first run**; repeat purchases on the same browser are one biometric prompt.

Card data never touches this app. What comes back is a single-use Visa network token with a dynamic
CVV, and every outcome is reported to Prava with `report-status` — unreported checkouts stay stuck
in `awaiting_result`.

### Supabase

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

Then set the two Supabase variables. The driver switches over automatically.

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
  catalog/                  vendor knowledge base
  store/                    file + Supabase drivers behind one interface
supabase/schema.sql
```

---

## Known limits

- The vendor catalog is a fixed snapshot, not a live crawler. Prices are published list rates
  captured on the date shown in each pricing card.
- The scripted agent's ranking uses an editorial "fit" prior (`lib/agent/scripted.ts`) alongside
  trust and budget headroom. It's kept out of the vendor catalog on purpose — the catalog holds
  verifiable facts, that map holds a judgement call, and the LLM path ignores it entirely.
- Single demo company, no auth. Approvals are recorded against `DEMO_USER_EMAIL`.
- `npm audit` reports advisories in `postcss` and `sharp`, both transitive dependencies bundled
  inside Next.js itself. There is no fix short of downgrading Next to v9; the app pins the patched
  15.5.22.
