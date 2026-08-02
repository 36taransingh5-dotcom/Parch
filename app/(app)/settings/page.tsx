import { ResetButton } from '@/components/settings/reset-button';
import { Badge, Card, SectionHeading } from '@/components/ui/primitives';
import { agentMode } from '@/lib/agent/run';
import { openaiModel } from '@/lib/agent/openai';
import { health, pravaMode } from '@/lib/prava/client';
import { sensoConfigured } from '@/lib/senso/client';
import { storeBackend } from '@/lib/store';

export const metadata = { title: 'Settings · OpsPilot' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const prava = pravaMode();
  const agent = agentMode();
  const reachable = await health();

  const integrations = [
    {
      name: 'Prava',
      role: 'Payments',
      live: prava !== 'simulated',
      value:
        prava === 'simulated'
          ? 'Simulated — no card is charged'
          : `${prava} · ${reachable ? 'reachable' : 'unreachable'}`,
      hint:
        prava === 'simulated'
          ? 'Set MERCHANT_SECRET_KEY and NEXT_PUBLIC_PUBLISHABLE_KEY to run the real PCI checkout with passkey approval.'
          : `Backend ${process.env.NEXT_PUBLIC_PRAVA_BACKEND_URL || 'https://sandbox.api.prava.space'}. Card data never reaches this app.`,
    },
    {
      name: 'OpenAI',
      role: 'Agent reasoning',
      live: agent === 'llm',
      value: agent === 'llm' ? `Responses API · ${openaiModel()}` : 'Scripted fallback agent',
      hint:
        agent === 'llm'
          ? 'The model researches and reasons. It still has no payment tool — approvals are the only path to a charge.'
          : 'Set OPENAI_API_KEY to swap the deterministic agent for the model. Both drive the same tools.',
    },
    {
      name: 'Senso',
      role: 'Merchant trust',
      live: sensoConfigured(),
      value: sensoConfigured() ? 'Live · blended with local signals' : 'Local trust model',
      hint: sensoConfigured()
        ? 'Senso scores are averaged with the local model so one flaky call cannot swing a recommendation.'
        : 'Set SENSO_API_KEY to fold live merchant verification into every trust check.',
    },
    {
      name: 'Supabase',
      role: 'Persistence',
      live: storeBackend() === 'supabase',
      value: storeBackend() === 'supabase' ? 'Postgres' : 'Local JSON file (.data/)',
      hint:
        storeBackend() === 'supabase'
          ? 'Purchases, subscriptions, approvals, transactions and invoices persist in Postgres.'
          : 'Run supabase/schema.sql and set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to persist in Postgres.',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="mt-1 text-[15px] text-ink-3">
          Every integration degrades to a working local mode, so the demo runs with an empty{' '}
          <code className="font-mono text-[13px]">.env.local</code> file.
        </p>
      </header>

      <Card className="overflow-hidden">
        <SectionHeading title="Integrations" />
        <ul className="divide-y divide-line border-t border-line">
          {integrations.map((integration) => (
            <li key={integration.name} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[15px] font-medium">{integration.name}</span>
                <span className="text-[13px] text-ink-3">{integration.role}</span>
                <Badge tone={integration.live ? 'good' : 'warn'} className="ml-auto">
                  {integration.value}
                </Badge>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{integration.hint}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <SectionHeading title="Company" />
        <dl className="divide-y divide-line border-t border-line text-[14px]">
          <Row label="Company" value={process.env.DEMO_COMPANY_NAME || 'Acme Inc.'} />
          <Row label="Approver" value={process.env.DEMO_USER_EMAIL || 'founder@acme.dev'} />
          <Row
            label="Purchase policy"
            value="Every purchase needs explicit human approval — the agent has no payment tool."
          />
        </dl>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <SectionHeading title="Demo controls" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="max-w-sm text-[13px] leading-relaxed text-ink-3">
            Reset clears every purchase, renewal and approval and restores the seed data — useful
            between demo runs.
          </p>
          <ResetButton />
        </div>
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-2 px-5 py-3.5">
      <dt className="w-36 shrink-0 text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink-2">{value}</dd>
    </div>
  );
}
