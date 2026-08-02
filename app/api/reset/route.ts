import { resetToSeed } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Wipes purchases, renewals and approvals back to the seed. Demo reset. */
export async function POST() {
  await resetToSeed();
  return Response.json({ ok: true });
}
