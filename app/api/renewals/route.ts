import {
  cancelSubscription,
  downgradeSubscription,
  listSubscriptions,
  renewSubscription,
} from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ subscriptions: await listSubscriptions() });
}

export async function POST(request: Request) {
  let body: { id?: string; action?: 'renew' | 'cancel' | 'downgrade'; plan?: string; price?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id) return Response.json({ error: 'id is required' }, { status: 400 });

  switch (body.action) {
    case 'renew': {
      const subscription = await renewSubscription(body.id);
      if (!subscription) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ subscription });
    }

    case 'cancel': {
      const subscription = await cancelSubscription(body.id);
      if (!subscription) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ subscription });
    }

    case 'downgrade': {
      if (!body.plan || typeof body.price !== 'number') {
        return Response.json(
          { error: 'plan and price are required to downgrade' },
          { status: 400 },
        );
      }
      const subscription = await downgradeSubscription(body.id, body.plan, body.price);
      if (!subscription) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ subscription });
    }

    default:
      return Response.json(
        { error: 'action must be "renew", "cancel" or "downgrade"' },
        { status: 400 },
      );
  }
}
