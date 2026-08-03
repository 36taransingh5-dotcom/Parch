import { getVendor } from '@/lib/catalog/vendors';
import { verifyApproval } from '@/lib/approvals/proof';
import { createSession, pravaMode } from '@/lib/prava/client';
import { decideApproval, getApproval } from '@/lib/store';
import type { Approval } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The human decision point.
 *
 * Approving does two things and only in this order: it records the decision,
 * then opens a Prava session for the exact amount that was on the card the
 * founder saw. The agent never reaches this route — the browser does, in
 * response to a click.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let body: { decision?: 'approve' | 'decline'; approval?: Approval };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // On Vercel, separate route handlers can execute in different isolated
  // instances, so the file/memory fallback may not contain the approval made
  // by /api/chat. The signed payload is the portable source of truth.
  const storedApproval = await getApproval(id);
  const portableApproval =
    body.approval?.id === id && verifyApproval(body.approval) ? body.approval : null;
  const approval = storedApproval ?? portableApproval;
  if (!approval) {
    return Response.json(
      { error: 'This approval expired. Ask Parch to prepare it again.' },
      { status: 404 },
    );
  }
  if (approval.status !== 'pending') {
    return Response.json(
      { error: `This request was already ${approval.status}.` },
      { status: 409 },
    );
  }

  const approvedBy = process.env.DEMO_USER_EMAIL || 'founder@acme.dev';

  if (body.decision === 'decline') {
    const declined =
      (await decideApproval(id, 'declined', approvedBy)) ?? {
        ...approval,
        status: 'declined' as const,
        approved_by: approvedBy,
        decided_at: new Date().toISOString(),
      };
    return Response.json({ approval: declined, session: null });
  }

  if (body.decision !== 'approve') {
    return Response.json({ error: 'decision must be "approve" or "decline"' }, { status: 400 });
  }

  const vendor = getVendor(approval.vendor_slug);

  let session;
  try {
    session = await createSession({
      userId: approvedBy,
      userEmail: approvedBy,
      amount: approval.price,
      currency: approval.currency,
      description: `${approval.vendor} ${approval.plan} — procured by Parch`,
      merchant: {
        name: approval.vendor,
        url: vendor?.url ?? `https://${approval.vendor_slug}.com`,
        countryCode: vendor?.countryCode ?? 'US',
        mcc: vendor?.mcc,
        category: vendor?.mccLabel,
      },
      product: {
        description: `${approval.vendor} ${approval.plan}`,
        unitPrice: approval.price,
        quantity: 1,
      },
    });
  } catch (error) {
    // Leave the approval pending so the founder can retry the payment
    // without the agent having to redo the research.
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Could not open a Prava checkout session.',
      },
      { status: 502 },
    );
  }

  const updated =
    (await decideApproval(id, 'approved', approvedBy)) ?? {
      ...approval,
      status: 'approved' as const,
      approved_by: approvedBy,
      decided_at: new Date().toISOString(),
    };

  return Response.json({
    approval: updated,
    session,
    mode: pravaMode(),
    publishableKey: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ?? null,
  });
}
