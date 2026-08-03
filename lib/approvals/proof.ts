import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Approval } from '@/lib/types';

const MAX_AGE_MS = 2 * 60 * 60 * 1_000;

function signingSecret() {
  return (
    process.env.APPROVAL_SIGNING_SECRET ||
    process.env.MERCHANT_SECRET_KEY ||
    process.env.OPENAI_API_KEY ||
    'parch-local-demo-signing-key'
  );
}

function payload(approval: Approval) {
  return JSON.stringify({
    id: approval.id,
    company_id: approval.company_id,
    requested_by: approval.requested_by,
    vendor: approval.vendor,
    vendor_slug: approval.vendor_slug,
    category: approval.category,
    plan: approval.plan,
    price: approval.price,
    currency: approval.currency,
    billing_cycle: approval.billing_cycle,
    reasoning: approval.reasoning,
    pros: approval.pros,
    cons: approval.cons,
    trust_score: approval.trust_score,
    monthly_saving: approval.monthly_saving,
    created_at: approval.created_at,
  });
}

export function signApproval(approval: Approval) {
  return createHmac('sha256', signingSecret()).update(payload(approval)).digest('hex');
}

export function verifyApproval(approval: Approval) {
  if (!approval.proof) return false;

  const createdAt = new Date(approval.created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > MAX_AGE_MS || createdAt > Date.now()) {
    return false;
  }

  const expected = Buffer.from(signApproval(approval), 'hex');
  const received = Buffer.from(approval.proof, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
