// ─────────────────────────────────────────────────────────────
// Domain types shared by the agent, the API routes and the UI.
// ─────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'annual' | 'one_time';

export type PurchaseStatus = 'active' | 'pending' | 'cancelled' | 'failed';

export type ApprovalStatus = 'pending' | 'approved' | 'declined' | 'expired';

// ── Vendor catalog ───────────────────────────────────────────

export interface PricingTier {
  name: string;
  price: number;
  cycle: BillingCycle;
  /** Free-text unit, e.g. "per user / month" or "flat". */
  unit: string;
  features: string[];
  /** Notable ceiling of the tier — shown in the comparison table. */
  limits?: string;
}

export interface Vendor {
  slug: string;
  name: string;
  /** Category slug this vendor competes in, e.g. "email-provider". */
  category: string;
  url: string;
  countryCode: string;
  /** Merchant category code, forwarded to the card network by Prava. */
  mcc: string;
  mccLabel: string;
  tagline: string;
  description: string;
  /** Brand mark initials used when no logo is available. */
  initials: string;
  brandColor: string;
  tiers: PricingTier[];
  strengths: string[];
  tradeoffs: string[];
  /** Signals the local trust model reads when Senso is not configured. */
  signals: {
    foundedYear: number;
    /** Public, verifiable customer count or similar scale marker. */
    scale: string;
    compliance: string[];
    /** 0–1. Share of reviews that are positive across public sources. */
    sentiment: number;
    incidents: string[];
  };
}

export interface Category {
  slug: string;
  label: string;
  /** Words a founder is likely to use for this category. */
  aliases: string[];
  description: string;
}

// ── Agent tool payloads ──────────────────────────────────────

export interface VendorSummary {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  initials: string;
  brandColor: string;
  /** Cheapest tier that satisfies the stated budget, if any. */
  entryPrice: number;
  entryCycle: BillingCycle;
  entryTier: string;
}

export interface PricingResult {
  vendor: string;
  slug: string;
  url: string;
  tiers: PricingTier[];
}

export interface ComparisonRow {
  slug: string;
  vendor: string;
  plan: string;
  price: number;
  cycle: BillingCycle;
  monthlyEquivalent: number;
  withinBudget: boolean;
  trustScore: number | null;
  highlights: string[];
  limits?: string;
}

export interface Comparison {
  budget: number | null;
  currency: string;
  rows: ComparisonRow[];
}

export interface TrustReport {
  slug: string;
  vendor: string;
  /** 0–100. */
  score: number;
  band: 'trusted' | 'established' | 'caution';
  label: string;
  verifiedSources: { name: string; url: string; note: string }[];
  warnings: string[];
  /** "senso" when the live API answered, "local" for the built-in model. */
  provider: 'senso' | 'local';
}

export interface Recommendation {
  slug: string;
  vendor: string;
  plan: string;
  price: number;
  cycle: BillingCycle;
  currency: string;
  reasoning: string;
  pros: string[];
  cons: string[];
  runnerUp?: { vendor: string; plan: string; price: number; why: string };
  trust?: TrustReport;
  /** Monthly saving versus the most expensive shortlisted option. */
  monthlySaving?: number;
}

// ── Persisted records ────────────────────────────────────────

export interface Purchase {
  id: string;
  company_id: string;
  vendor: string;
  vendor_slug: string;
  category: string;
  product: string;
  price: number;
  currency: string;
  billing_cycle: BillingCycle;
  renewal_date: string | null;
  status: PurchaseStatus;
  invoice_url: string | null;
  transaction_id: string | null;
  /** Last 4 of the network token Prava issued, for the receipt. */
  card_last4: string | null;
  trust_score: number | null;
  /** Monthly saving versus the priciest option the agent shortlisted. */
  monthly_saving: number | null;
  reasoning: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  purchase_id: string;
  vendor: string;
  vendor_slug: string;
  plan: string;
  price: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_payment: string;
  status: 'active' | 'cancelled' | 'downgraded';
  created_at: string;
}

export interface Approval {
  id: string;
  company_id: string;
  requested_by: string;
  approved_by: string | null;
  status: ApprovalStatus;
  vendor: string;
  vendor_slug: string;
  category: string;
  plan: string;
  price: number;
  currency: string;
  billing_cycle: BillingCycle;
  reasoning: string;
  pros: string[];
  cons: string[];
  trust_score: number | null;
  monthly_saving: number | null;
  created_at: string;
  decided_at: string | null;
}

export interface Transaction {
  id: string;
  company_id: string;
  purchase_id: string | null;
  approval_id: string | null;
  session_id: string;
  order_id: string | null;
  txn_ref_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'reported';
  provider: 'prava' | 'prava_simulated';
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  purchase_id: string;
  number: string;
  amount: number;
  currency: string;
  url: string;
  issued_at: string;
}

export interface DashboardStats {
  monthlySpend: number;
  activeSubscriptions: number;
  upcomingRenewals: number;
  pendingApprovals: number;
  /** Modelled saving from picking the recommended tier over the priciest one. */
  monthlySavings: number;
  annualisedSpend: number;
}

// ── Chat / streaming ─────────────────────────────────────────

export type ToolName =
  | 'searchVendors'
  | 'fetchPricing'
  | 'compareOptions'
  | 'checkMerchantTrust'
  | 'createRecommendation'
  | 'requestApproval';

export interface ToolCallRecord {
  id: string;
  name: ToolName;
  label: string;
  args: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  result?: unknown;
  error?: string;
  startedAt: number;
  endedAt?: number;
}

export type StreamEvent =
  | { type: 'status'; text: string }
  | { type: 'tool_start'; call: ToolCallRecord }
  | { type: 'tool_end'; call: ToolCallRecord }
  | { type: 'text_delta'; text: string }
  | { type: 'approval'; approval: Approval; recommendation: Recommendation }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  calls?: ToolCallRecord[];
  approval?: Approval;
  recommendation?: Recommendation;
  purchase?: Purchase;
  createdAt: number;
}

/** Trimmed history the client sends back so the agent keeps context. */
export interface WireMessage {
  role: 'user' | 'assistant';
  content: string;
}
