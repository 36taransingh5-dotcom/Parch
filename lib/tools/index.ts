import 'server-only';

import {
  CATEGORIES,
  PRICING_CAPTURED_AT,
  VENDORS,
  getCategory,
  getVendor,
  resolveCategory,
  vendorsInCategory,
} from '@/lib/catalog/vendors';
import { checkMerchantTrust as sensoTrust } from '@/lib/senso/client';
import { createApproval } from '@/lib/store';
import type {
  Approval,
  Comparison,
  ComparisonRow,
  PricingResult,
  Recommendation,
  ToolName,
  TrustReport,
  Vendor,
  VendorSummary,
} from '@/lib/types';
import { monthlyEquivalent } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// The agent's tool belt.
//
// Note what is NOT here: nothing that spends money. The model can research,
// compare, verify and *request* approval — the purchase itself is triggered
// by a human clicking Approve, which runs `purchaseWithPrava` in the approval
// route. A model that cannot reach the payment API cannot buy something by
// accident, no matter what a prompt says.
// ─────────────────────────────────────────────────────────────

/** Per-conversation scratchpad, so later tools can build on earlier ones. */
export interface ToolContext {
  requestedBy: string;
  budget: number | null;
  seats: number;
  categorySlug: string | null;
  pricing: Map<string, PricingResult>;
  trust: Map<string, TrustReport>;
  comparison: Comparison | null;
  recommendation: Recommendation | null;
  approval: Approval | null;
}

export function newToolContext(requestedBy: string): ToolContext {
  return {
    requestedBy,
    budget: null,
    seats: 1,
    categorySlug: null,
    pricing: new Map(),
    trust: new Map(),
    comparison: null,
    recommendation: null,
    approval: null,
  };
}

export const TOOL_LABELS: Record<ToolName, string> = {
  searchVendors: 'Searching vendors',
  fetchPricing: 'Reading pricing',
  compareOptions: 'Comparing options',
  checkMerchantTrust: 'Verifying merchant trust',
  createRecommendation: 'Preparing recommendation',
  requestApproval: 'Requesting approval',
};

// ── Tool schemas handed to the model ─────────────────────────

export const TOOL_SCHEMAS = [
  {
    type: 'function' as const,
    name: 'searchVendors',
    description:
      'Find candidate vendors in a software category. Call this first. Returns each vendor with its cheapest qualifying plan.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: `Category to search. One of: ${CATEGORIES.map((c) => c.slug).join(', ')}. Free text like "email provider" or "code editor AI" is also accepted.`,
        },
        budget: {
          type: ['number', 'null'],
          description: 'Maximum monthly spend in USD, or null when the user gave no budget.',
        },
        seats: {
          type: ['number', 'null'],
          description: 'Number of seats needed for per-user tools. Defaults to 1.',
        },
      },
      required: ['category', 'budget', 'seats'],
      additionalProperties: false,
    },
  },
  {
    type: 'function' as const,
    name: 'fetchPricing',
    description:
      'Read the published pricing tiers for one vendor. Call it for each shortlisted vendor (calls may run in parallel).',
    parameters: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Vendor slug or name, e.g. "resend".' },
      },
      required: ['vendor'],
      additionalProperties: false,
    },
  },
  {
    type: 'function' as const,
    name: 'compareOptions',
    description:
      'Build a side-by-side comparison of the shortlisted vendors, normalised to monthly cost and flagged against the budget.',
    parameters: {
      type: 'object',
      properties: {
        vendors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Vendor slugs to compare — at least two.',
        },
        budget: { type: ['number', 'null'], description: 'Monthly budget in USD, or null.' },
        seats: { type: ['number', 'null'], description: 'Seat count for per-user pricing.' },
      },
      required: ['vendors', 'budget', 'seats'],
      additionalProperties: false,
    },
  },
  {
    type: 'function' as const,
    name: 'checkMerchantTrust',
    description:
      'Verify a merchant before recommending it: trust score, verified sources and warnings. Call for every vendor you would consider buying.',
    parameters: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Vendor slug or name.' },
      },
      required: ['vendor'],
      additionalProperties: false,
    },
  },
  {
    type: 'function' as const,
    name: 'createRecommendation',
    description:
      'Record your final pick with the reasoning behind it. Call after comparing options and checking trust.',
    parameters: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Vendor slug of the winner.' },
        plan: { type: 'string', description: 'Exact plan name from that vendor pricing.' },
        reasoning: {
          type: 'string',
          description: 'Two or three sentences on why this wins for this specific team.',
        },
        pros: { type: 'array', items: { type: 'string' }, description: '2-4 concrete advantages.' },
        cons: {
          type: 'array',
          items: { type: 'string' },
          description: '1-3 honest drawbacks. Never leave this empty.',
        },
        runnerUpVendor: {
          type: ['string', 'null'],
          description: 'Slug of the second choice, or null.',
        },
        runnerUpWhy: {
          type: ['string', 'null'],
          description: 'One sentence on when the runner-up would have won instead.',
        },
      },
      required: ['vendor', 'plan', 'reasoning', 'pros', 'cons', 'runnerUpVendor', 'runnerUpWhy'],
      additionalProperties: false,
    },
  },
  {
    type: 'function' as const,
    name: 'requestApproval',
    description:
      'Ask the founder to approve the purchase. This is the last tool you call — stop and wait for a human decision. You cannot buy anything yourself.',
    parameters: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Vendor slug being purchased.' },
        plan: { type: 'string', description: 'Plan name.' },
      },
      required: ['vendor', 'plan'],
      additionalProperties: false,
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────

function findVendor(needle: string): Vendor | undefined {
  const q = needle.toLowerCase().trim();
  return (
    getVendor(q) ??
    VENDORS.find((v) => v.name.toLowerCase() === q) ??
    VENDORS.find((v) => v.name.toLowerCase().includes(q) || q.includes(v.slug))
  );
}

/** Cheapest paid tier a team of `seats` can use inside `budget`. */
function entryTier(vendor: Vendor, budget: number | null, seats: number) {
  const priced = vendor.tiers
    .map((tier) => ({
      tier,
      effective: tier.unit.includes('per user') || tier.unit.includes('per editor') || tier.unit.includes('per seat')
        ? tier.price * seats
        : tier.price,
    }))
    .sort((a, b) => a.effective - b.effective);

  // Prefer the cheapest paid tier that fits; a free tier is only the answer
  // when nothing paid qualifies.
  const paid = priced.filter((p) => p.effective > 0);
  const affordable = budget == null ? paid : paid.filter((p) => p.effective <= budget);
  const chosen = affordable[0] ?? paid[0] ?? priced[0];
  return chosen;
}

function toSummary(vendor: Vendor, budget: number | null, seats: number): VendorSummary {
  const { tier, effective } = entryTier(vendor, budget, seats);
  return {
    slug: vendor.slug,
    name: vendor.name,
    tagline: vendor.tagline,
    url: vendor.url,
    initials: vendor.initials,
    brandColor: vendor.brandColor,
    entryPrice: Math.round(effective * 100) / 100,
    entryCycle: tier.cycle,
    entryTier: tier.name,
  };
}

// ── Tool implementations ─────────────────────────────────────

export interface ToolOutcome {
  /** Sent back to the model as the function-call output. */
  result: unknown;
  /** Rendered by the chat UI in the tool card. */
  display: unknown;
}

async function searchVendors(
  args: { category?: string; budget?: number | null; seats?: number | null },
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const category =
    (args.category && getCategory(args.category)) ||
    (args.category ? resolveCategory(args.category) : undefined);

  if (!category) {
    return {
      result: {
        error: 'unknown_category',
        message: `No catalog coverage for "${args.category}". Tell the user which categories you can procure and ask them to pick one.`,
        availableCategories: CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
      },
      display: { error: true, categories: CATEGORIES.map((c) => c.label) },
    };
  }

  ctx.categorySlug = category.slug;
  if (typeof args.budget === 'number') ctx.budget = args.budget;
  if (typeof args.seats === 'number' && args.seats > 0) ctx.seats = args.seats;

  const vendors = vendorsInCategory(category.slug)
    .map((v) => toSummary(v, ctx.budget, ctx.seats))
    .sort((a, b) => a.entryPrice - b.entryPrice);

  return {
    result: {
      category: category.slug,
      categoryLabel: category.label,
      budget: ctx.budget,
      seats: ctx.seats,
      vendors,
    },
    display: { categoryLabel: category.label, vendors, budget: ctx.budget, seats: ctx.seats },
  };
}

async function fetchPricing(args: { vendor?: string }, ctx: ToolContext): Promise<ToolOutcome> {
  const vendor = findVendor(args.vendor ?? '');
  if (!vendor) {
    return {
      result: { error: 'unknown_vendor', vendor: args.vendor },
      display: { error: true, vendor: args.vendor },
    };
  }

  const pricing: PricingResult = {
    vendor: vendor.name,
    slug: vendor.slug,
    url: vendor.url,
    tiers: vendor.tiers,
  };
  ctx.pricing.set(vendor.slug, pricing);

  return {
    result: { ...pricing, capturedAt: PRICING_CAPTURED_AT, seats: ctx.seats },
    display: { ...pricing, capturedAt: PRICING_CAPTURED_AT },
  };
}

async function compareOptions(
  args: { vendors?: string[]; budget?: number | null; seats?: number | null },
  ctx: ToolContext,
): Promise<ToolOutcome> {
  if (typeof args.budget === 'number') ctx.budget = args.budget;
  if (typeof args.seats === 'number' && args.seats > 0) ctx.seats = args.seats;

  const slugs =
    args.vendors && args.vendors.length
      ? args.vendors
      : ctx.categorySlug
        ? vendorsInCategory(ctx.categorySlug).map((v) => v.slug)
        : [];

  const rows: ComparisonRow[] = [];

  for (const needle of slugs) {
    const vendor = findVendor(needle);
    if (!vendor) continue;

    const { tier, effective } = entryTier(vendor, ctx.budget, ctx.seats);
    const monthly = monthlyEquivalent(effective, tier.cycle);

    rows.push({
      slug: vendor.slug,
      vendor: vendor.name,
      plan: tier.name,
      price: Math.round(effective * 100) / 100,
      cycle: tier.cycle,
      monthlyEquivalent: Math.round(monthly * 100) / 100,
      withinBudget: ctx.budget == null ? true : monthly <= ctx.budget,
      trustScore: ctx.trust.get(vendor.slug)?.score ?? null,
      highlights: tier.features.slice(0, 3),
      limits: tier.limits,
    });
  }

  rows.sort((a, b) => a.monthlyEquivalent - b.monthlyEquivalent);

  const comparison: Comparison = { budget: ctx.budget, currency: 'USD', rows };
  ctx.comparison = comparison;

  return { result: comparison, display: comparison };
}

async function checkMerchantTrust(
  args: { vendor?: string },
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const vendor = findVendor(args.vendor ?? '');
  if (!vendor) {
    return {
      result: { error: 'unknown_vendor', vendor: args.vendor },
      display: { error: true, vendor: args.vendor },
    };
  }

  const report = await sensoTrust(vendor);
  ctx.trust.set(vendor.slug, report);

  // Backfill any comparison already on screen so trust and price stay in sync.
  if (ctx.comparison) {
    for (const row of ctx.comparison.rows) {
      if (row.slug === vendor.slug) row.trustScore = report.score;
    }
  }

  return { result: report, display: report };
}

async function createRecommendation(
  args: {
    vendor?: string;
    plan?: string;
    reasoning?: string;
    pros?: string[];
    cons?: string[];
    runnerUpVendor?: string | null;
    runnerUpWhy?: string | null;
  },
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const vendor = findVendor(args.vendor ?? '');
  if (!vendor) {
    return {
      result: { error: 'unknown_vendor', vendor: args.vendor },
      display: { error: true, vendor: args.vendor },
    };
  }

  const tier =
    vendor.tiers.find((t) => t.name.toLowerCase() === (args.plan ?? '').toLowerCase()) ??
    entryTier(vendor, ctx.budget, ctx.seats).tier;

  const perSeat =
    tier.unit.includes('per user') || tier.unit.includes('per editor') || tier.unit.includes('per seat');
  const price = Math.round((perSeat ? tier.price * ctx.seats : tier.price) * 100) / 100;

  const trust = ctx.trust.get(vendor.slug);

  // Saving is only claimed against options we actually put in front of the
  // user, never against an invented list price.
  const priciest = ctx.comparison?.rows.reduce(
    (max, row) => Math.max(max, row.monthlyEquivalent),
    0,
  );
  const chosenMonthly = monthlyEquivalent(price, tier.cycle);
  const monthlySaving =
    priciest && priciest > chosenMonthly ? Math.round((priciest - chosenMonthly) * 100) / 100 : 0;

  const runnerUpVendor = args.runnerUpVendor ? findVendor(args.runnerUpVendor) : undefined;
  const runnerUpRow = runnerUpVendor
    ? ctx.comparison?.rows.find((r) => r.slug === runnerUpVendor.slug)
    : undefined;

  const recommendation: Recommendation = {
    slug: vendor.slug,
    vendor: vendor.name,
    plan: tier.name,
    price,
    cycle: tier.cycle,
    currency: 'USD',
    reasoning: args.reasoning ?? `${vendor.name} ${tier.name} is the best fit for the stated need.`,
    pros: args.pros?.length ? args.pros : vendor.strengths.slice(0, 3),
    cons: args.cons?.length ? args.cons : vendor.tradeoffs.slice(0, 2),
    trust,
    monthlySaving,
    ...(runnerUpVendor && {
      runnerUp: {
        vendor: runnerUpVendor.name,
        plan: runnerUpRow?.plan ?? runnerUpVendor.tiers[1]?.name ?? runnerUpVendor.tiers[0].name,
        price: runnerUpRow?.price ?? runnerUpVendor.tiers[1]?.price ?? 0,
        why: args.runnerUpWhy ?? `${runnerUpVendor.name} is the fallback if requirements change.`,
      },
    }),
  };

  ctx.recommendation = recommendation;
  return { result: recommendation, display: recommendation };
}

async function requestApproval(
  args: { vendor?: string; plan?: string },
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const recommendation = ctx.recommendation;
  if (!recommendation) {
    return {
      result: {
        error: 'no_recommendation',
        message: 'Call createRecommendation before requesting approval.',
      },
      display: { error: true },
    };
  }

  const vendor = findVendor(args.vendor ?? recommendation.slug);
  const category = ctx.categorySlug ? getCategory(ctx.categorySlug) : undefined;

  const approval = await createApproval({
    requested_by: ctx.requestedBy,
    vendor: recommendation.vendor,
    vendor_slug: recommendation.slug,
    category: category?.label ?? vendor?.category ?? 'Software',
    plan: recommendation.plan,
    price: recommendation.price,
    currency: recommendation.currency,
    billing_cycle: recommendation.cycle,
    reasoning: recommendation.reasoning,
    pros: recommendation.pros,
    cons: recommendation.cons,
    trust_score: recommendation.trust?.score ?? null,
    monthly_saving: recommendation.monthlySaving ?? null,
  });

  ctx.approval = approval;

  return {
    result: {
      approvalId: approval.id,
      status: 'pending',
      message:
        'Approval card shown to the founder. Stop here — do not describe the purchase as complete. Give a one-line summary of what you are asking them to approve.',
    },
    display: { approval, recommendation },
  };
}

// ── Dispatch ─────────────────────────────────────────────────

const EXECUTORS: Record<
  ToolName,
  (args: never, ctx: ToolContext) => Promise<ToolOutcome>
> = {
  searchVendors: searchVendors as never,
  fetchPricing: fetchPricing as never,
  compareOptions: compareOptions as never,
  checkMerchantTrust: checkMerchantTrust as never,
  createRecommendation: createRecommendation as never,
  requestApproval: requestApproval as never,
};

export function isToolName(name: string): name is ToolName {
  return name in EXECUTORS;
}

export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  return EXECUTORS[name](args as never, ctx);
}
