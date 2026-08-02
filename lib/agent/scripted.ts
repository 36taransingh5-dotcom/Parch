import 'server-only';

import {
  CATEGORIES,
  extractBudget,
  extractSeats,
  getVendor,
  resolveCategory,
} from '@/lib/catalog/vendors';
import { executeTool, newToolContext, TOOL_LABELS, type ToolContext } from '@/lib/tools';
import type { Comparison, Recommendation, StreamEvent, ToolCallRecord, ToolName } from '@/lib/types';
import { formatMoney, id, sleep } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Deterministic fallback agent.
//
// Runs when OPENAI_API_KEY is absent, and as a rescue if the model call
// fails before producing anything. It drives the *same* tools in the same
// order and emits the same events, so the UI and the approval → Prava path
// are identical either way. A hackathon demo should not be one API outage
// away from a blank screen.
// ─────────────────────────────────────────────────────────────

/**
 * Editorial prior: how well a vendor serves a typical seed-stage startup in
 * its category. Deliberately kept out of the vendor catalog — the catalog
 * holds verifiable facts, this holds a judgement call, and only the scripted
 * ranker reads it. The LLM path reasons from the facts instead.
 */
const FIT: Record<string, number> = {
  resend: 0.95,
  postmark: 0.8,
  mailgun: 0.7,
  sendgrid: 0.6,

  'github-copilot': 0.95,
  cursor: 0.85,
  windsurf: 0.75,
  tabnine: 0.6,

  figma: 0.95,
  sketch: 0.65,
  penpot: 0.6,

  posthog: 0.9,
  mixpanel: 0.8,
  amplitude: 0.6,

  sentry: 0.92,
  rollbar: 0.75,
  bugsnag: 0.6,

  '1password': 0.9,
  bitwarden: 0.85,
  dashlane: 0.6,

  front: 0.85,
  'help-scout': 0.8,
  intercom: 0.65,
};

/** Typing cadence for streamed prose, in ms per word. */
const TYPE_MS = 14;

/** Visible dwell on each tool card — the tools themselves are instant. */
const TOOL_DWELL_MS = 420;

async function* say(text: string): AsyncGenerator<StreamEvent> {
  // Chunk on word boundaries so nothing ever renders mid-word.
  const chunks = text.match(/\S+\s*/g) ?? [text];
  for (const chunk of chunks) {
    yield { type: 'text_delta', text: chunk };
    await sleep(TYPE_MS);
  }
}

/** Runs one tool, emitting start/end cards, and returns its model-facing result. */
async function* runTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
): AsyncGenerator<StreamEvent, unknown> {
  const call: ToolCallRecord = {
    id: id('call'),
    name,
    label: TOOL_LABELS[name],
    args,
    status: 'running',
    startedAt: Date.now(),
  };
  yield { type: 'tool_start', call };

  await sleep(TOOL_DWELL_MS);

  try {
    const { result, display } = await executeTool(name, args, ctx);
    yield {
      type: 'tool_end',
      call: { ...call, status: 'done', result: display, endedAt: Date.now() },
    };
    return result;
  } catch (error) {
    yield {
      type: 'tool_end',
      call: {
        ...call,
        status: 'error',
        error: error instanceof Error ? error.message : 'Tool failed',
        endedAt: Date.now(),
      },
    };
    return null;
  }
}

function rank(comparison: Comparison, budget: number | null) {
  return comparison.rows
    .map((row) => {
      const trust = (row.trustScore ?? 60) / 100;
      const fit = FIT[row.slug] ?? 0.7;
      const headroom =
        budget && budget > 0
          ? Math.max(0, Math.min(1, (budget - row.monthlyEquivalent) / budget))
          : 0.5;
      return { row, score: 0.45 * trust + 0.35 * fit + 0.2 * headroom };
    })
    .sort((a, b) => b.score - a.score);
}

export async function* runScripted(
  userMessage: string,
  requestedBy: string,
): AsyncGenerator<StreamEvent> {
  const ctx = newToolContext(requestedBy);
  const category = resolveCategory(userMessage);

  if (!category) {
    yield* say(
      `I couldn't match that to something I procure. Right now I cover:\n\n${CATEGORIES.map(
        (c) => `- **${c.label}** — ${c.description}`,
      ).join('\n')}\n\nName one plus a monthly budget and I'll run the whole thing end to end.`,
    );
    yield { type: 'done' };
    return;
  }

  const budget = extractBudget(userMessage);
  const seats = extractSeats(userMessage);
  ctx.budget = budget;
  ctx.seats = seats;

  yield* say(
    `On it — **${category.label}**${budget ? `, ceiling ${formatMoney(budget)}/month` : ''}${
      seats > 1 ? `, ${seats} seats` : ''
    }.\n\n`,
  );

  // 1 — search
  const search = (yield* runTool(
    'searchVendors',
    { category: category.slug, budget, seats },
    ctx,
  )) as { vendors?: { slug: string }[] } | null;

  // Four is the sweet spot: enough for a real comparison, few enough that the
  // whole run still lands well under two minutes.
  const shortlist = (search?.vendors ?? []).slice(0, 4).map((v) => v.slug);
  if (!shortlist.length) {
    yield* say(`I found nothing priceable in ${category.label}. Try another category.`);
    yield { type: 'done' };
    return;
  }

  // 2 — pricing, 3 — trust
  for (const slug of shortlist) {
    yield* runTool('fetchPricing', { vendor: slug }, ctx);
  }
  for (const slug of shortlist) {
    yield* runTool('checkMerchantTrust', { vendor: slug }, ctx);
  }

  // 4 — compare
  yield* runTool('compareOptions', { vendors: shortlist, budget, seats }, ctx);

  const comparison = ctx.comparison;
  if (!comparison?.rows.length) {
    yield* say('I could not build a comparison for that. Try naming the category directly.');
    yield { type: 'done' };
    return;
  }

  // 5 — pick. Prefer options that clear both the budget and the trust bar;
  // fall back to the full shortlist only when nothing does, so the founder
  // still gets an answer plus an explicit warning.
  const eligible = comparison.rows.filter((r) => r.withinBudget && (r.trustScore ?? 0) >= 70);
  const ranked = rank(eligible.length ? { ...comparison, rows: eligible } : comparison, budget);
  const winner = ranked[0].row;
  const runnerUp = ranked[1]?.row;

  const winnerVendor = getVendor(winner.slug);
  const overBudget = budget != null && winner.monthlyEquivalent > budget;

  const reasoning = overBudget
    ? `Nothing in ${category.label} clears ${formatMoney(budget)}/mo with a trust score I'd stand behind. ${winner.vendor} ${winner.plan} is the closest credible option at ${formatMoney(winner.monthlyEquivalent)}/mo — ${formatMoney(winner.monthlyEquivalent - budget)} over the ceiling.`
    : `${winner.vendor} ${winner.plan} lands at ${formatMoney(winner.monthlyEquivalent)}/mo with a trust score of ${winner.trustScore}/100${
        budget ? `, leaving ${formatMoney(budget - winner.monthlyEquivalent)}/mo of headroom` : ''
      }.${winnerVendor?.strengths[0] ? ` ${winnerVendor.strengths[0]}.` : ''}`;

  yield* runTool(
    'createRecommendation',
    {
      vendor: winner.slug,
      plan: winner.plan,
      reasoning,
      pros: winnerVendor?.strengths.slice(0, 3) ?? [],
      cons: winnerVendor?.tradeoffs.slice(0, 2) ?? [],
      runnerUpVendor: runnerUp?.slug ?? null,
      runnerUpWhy: runnerUp
        ? `${runnerUp.vendor} is the fallback: ${getVendor(runnerUp.slug)?.strengths[0] ?? 'a different balance of price and capability'}.`
        : null,
    },
    ctx,
  );

  const recommendation = ctx.recommendation as Recommendation | null;
  if (recommendation) {
    yield* say(
      `**${recommendation.vendor} ${recommendation.plan} — ${formatMoney(recommendation.price)}/${
        recommendation.cycle === 'annual' ? 'yr' : 'mo'
      }.**\n\n${recommendation.reasoning}\n\nTrade-off I'm accepting: ${
        recommendation.cons[0] ?? 'nothing material at this price'
      }.${
        recommendation.runnerUp
          ? `\n\nRunner-up: **${recommendation.runnerUp.vendor}** — ${recommendation.runnerUp.why}`
          : ''
      }\n\n`,
    );
  }

  // 6 — approval. Stops here; payment needs a human.
  yield* runTool('requestApproval', { vendor: winner.slug, plan: winner.plan }, ctx);

  if (ctx.approval && ctx.recommendation) {
    yield { type: 'approval', approval: ctx.approval, recommendation: ctx.recommendation };
    yield* say(`Approve below and I'll put it through Prava.`);
  }

  yield { type: 'done' };
}
