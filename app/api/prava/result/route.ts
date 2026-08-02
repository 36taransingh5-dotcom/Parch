import { getPaymentResult, reportStatus } from '@/lib/prava/client';
import { getApproval, recordPurchase } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Polled by the checkout modal every few seconds.
 *
 * On `completed` this closes the loop in one shot: report the outcome back to
 * Prava (required — unreported checkouts stay stuck in `awaiting_result`),
 * then write the purchase, subscription, invoice and transaction.
 */
export async function POST(request: Request) {
  let body: { sessionId?: string; approvalId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId, approvalId } = body;
  if (!sessionId) {
    return Response.json({ error: 'sessionId is required' }, { status: 400 });
  }

  let result;
  try {
    result = await getPaymentResult(sessionId);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Prava poll failed' },
      { status: 502 },
    );
  }

  if (result.status !== 'completed') {
    const failure = result.transactions[0]?.error?.message;
    return Response.json({
      status: result.status,
      simulated: result.simulated,
      ...(failure && { message: failure }),
    });
  }

  const transaction = result.transactions[0];
  const lineItem = transaction?.line_items?.[0];

  if (!lineItem) {
    return Response.json(
      { status: 'failed', message: 'Prava reported completion with no line item.' },
      { status: 502 },
    );
  }

  // Report before persisting: if this app crashes right after, Prava still
  // has a settled transaction rather than one stuck awaiting a result.
  const reported = await reportStatus(
    sessionId,
    lineItem.txn_ref_id,
    'APPROVED',
    transaction.txn_id,
  );

  const approval = approvalId ? await getApproval(approvalId) : null;
  if (!approval) {
    return Response.json(
      { status: 'failed', message: 'The approval behind this payment could not be found.' },
      { status: 404 },
    );
  }

  const { purchase, subscription, invoice } = await recordPurchase({
    vendor: approval.vendor,
    vendorSlug: approval.vendor_slug,
    category: approval.category,
    product: approval.plan,
    price: approval.price,
    currency: approval.currency,
    billingCycle: approval.billing_cycle,
    trustScore: approval.trust_score,
    reasoning: approval.reasoning,
    monthlySaving: approval.monthly_saving ?? undefined,
    approvalId: approval.id,
    sessionId,
    orderId: result.order_id,
    txnRefId: lineItem.txn_ref_id,
    // Only the last four of the *network token* — the single-use credential
    // Prava issued, never the founder's real card.
    cardLast4: lineItem.token ? lineItem.token.slice(-4) : null,
    simulated: result.simulated,
  });

  return Response.json({
    status: 'completed',
    simulated: result.simulated,
    reported,
    purchase,
    subscription,
    invoice,
    receipt: {
      transactionId: transaction.txn_id,
      orderId: result.order_id,
      merchant: lineItem.merchant_name,
      amount: lineItem.total_amount,
      tokenLast4: lineItem.token ? lineItem.token.slice(-4) : null,
      expiry:
        lineItem.expiry_month && lineItem.expiry_year
          ? `${lineItem.expiry_month}/${lineItem.expiry_year}`
          : null,
    },
  });
}
