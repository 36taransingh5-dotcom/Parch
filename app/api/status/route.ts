import { agentMode } from '@/lib/agent/run';
import { openaiModel } from '@/lib/agent/openai';
import { health, pravaMode } from '@/lib/prava/client';
import { sensoConfigured } from '@/lib/senso/client';
import { storeBackend } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Integration status for the settings page. Reports config, never secrets. */
export async function GET() {
  const prava = pravaMode();

  return Response.json({
    agent: { mode: agentMode(), model: agentMode() === 'llm' ? openaiModel() : null },
    prava: {
      mode: prava,
      backendUrl:
        process.env.NEXT_PUBLIC_PRAVA_BACKEND_URL || 'https://sandbox.api.prava.space',
      reachable: await health(),
      publishableKeyPresent: Boolean(process.env.NEXT_PUBLIC_PUBLISHABLE_KEY),
    },
    senso: { mode: sensoConfigured() ? 'live' : 'local' },
    store: { backend: storeBackend() },
  });
}
