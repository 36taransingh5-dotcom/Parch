import type { Category, Vendor } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Vendor knowledge base.
//
// The agent researches against this catalog rather than live-crawling
// pricing pages: a procurement run has to finish in under two minutes and
// stay identical every time a judge runs it. Prices are publicly listed
// rates captured for the demo, not live quotes — `fetchPricing` stamps
// every result with `capturedAt` so the UI can say so out loud.
// ─────────────────────────────────────────────────────────────

export const PRICING_CAPTURED_AT = '2026-07-15';

export const CATEGORIES: Category[] = [
  {
    slug: 'email-provider',
    label: 'Transactional email',
    aliases: [
      'email',
      'email provider',
      'transactional email',
      'email api',
      'smtp',
      'mail',
      'email sending',
      'email service',
    ],
    description: 'APIs for sending product and transactional email.',
  },
  {
    slug: 'ai-code-assistant',
    label: 'AI code assistant',
    aliases: [
      'code editor',
      'code editor ai',
      'ai code',
      'copilot',
      'coding assistant',
      'ai pair programmer',
      'ide',
      'autocomplete',
      'developer tool',
    ],
    description: 'AI autocomplete and agentic coding inside the editor.',
  },
  {
    slug: 'design-tool',
    label: 'Design tool',
    aliases: ['design', 'design tool', 'ui design', 'figma', 'prototyping', 'mockups'],
    description: 'Collaborative interface design and prototyping.',
  },
  {
    slug: 'product-analytics',
    label: 'Product analytics',
    aliases: [
      'analytics',
      'product analytics',
      'user analytics',
      'event tracking',
      'funnels',
      'metrics',
    ],
    description: 'Event analytics, funnels and retention reporting.',
  },
  {
    slug: 'error-monitoring',
    label: 'Error monitoring',
    aliases: [
      'error monitoring',
      'error tracking',
      'crash reporting',
      'observability',
      'apm',
      'exceptions',
      'monitoring',
    ],
    description: 'Exception tracking and release health for production apps.',
  },
  {
    slug: 'password-manager',
    label: 'Password manager',
    aliases: [
      'password manager',
      'passwords',
      'secrets',
      'credential manager',
      'vault',
      'security tool',
    ],
    description: 'Shared credential vaults with team access controls.',
  },
  {
    slug: 'customer-support',
    label: 'Customer support',
    aliases: [
      'support',
      'customer support',
      'helpdesk',
      'help desk',
      'live chat',
      'shared inbox',
      'ticketing',
    ],
    description: 'Shared inboxes, live chat and ticketing for customer teams.',
  },
];

export const VENDORS: Vendor[] = [
  // ── Transactional email ────────────────────────────────────
  {
    slug: 'resend',
    name: 'Resend',
    category: 'email-provider',
    url: 'https://resend.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'RS',
    brandColor: '#0A0A0A',
    tagline: 'Email for developers, built on React Email.',
    description:
      'Modern transactional email API with first-class React templating, a clean dashboard and generous free tier. Popular with Next.js teams.',
    tiers: [
      {
        name: 'Free',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['3,000 emails/mo', '1 custom domain', 'React Email templates'],
        limits: '100 emails/day',
      },
      {
        name: 'Pro',
        price: 20,
        cycle: 'monthly',
        unit: 'flat',
        features: [
          '50,000 emails/mo',
          '10 custom domains',
          'Dedicated IP available',
          '3 day log retention',
          'Webhooks + email API',
        ],
        limits: '50,000 emails/mo',
      },
      {
        name: 'Scale',
        price: 90,
        cycle: 'monthly',
        unit: 'flat',
        features: ['100,000 emails/mo', 'Unlimited domains', '7 day retention', 'Priority support'],
        limits: '100,000 emails/mo',
      },
    ],
    strengths: [
      'Cleanest developer experience of the shortlist',
      'React Email means templates live in your repo',
      'Free tier covers a pre-launch startup entirely',
    ],
    tradeoffs: ['Youngest company here', 'Log retention is only 3 days on Pro'],
    signals: {
      foundedYear: 2023,
      scale: '10,000+ developer teams',
      compliance: ['SOC 2 Type II', 'GDPR', 'DPA available'],
      sentiment: 0.94,
      incidents: [],
    },
  },
  {
    slug: 'postmark',
    name: 'Postmark',
    category: 'email-provider',
    url: 'https://postmarkapp.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'PM',
    brandColor: '#FFDE00',
    tagline: 'Obsessive about transactional delivery speed.',
    description:
      'Long-running transactional-only provider with best-in-class inbox placement and 45-day message history. Refuses bulk marketing mail, which keeps its IP reputation high.',
    tiers: [
      {
        name: 'Basic 10k',
        price: 15,
        cycle: 'monthly',
        unit: 'flat',
        features: ['10,000 emails/mo', '45 day message history', 'Inbound parsing', 'SMTP + API'],
        limits: '10,000 emails/mo',
      },
      {
        name: 'Basic 50k',
        price: 55,
        cycle: 'monthly',
        unit: 'flat',
        features: ['50,000 emails/mo', '45 day history', 'Dedicated IP option'],
        limits: '50,000 emails/mo',
      },
      {
        name: 'Pro 125k',
        price: 115,
        cycle: 'monthly',
        unit: 'flat',
        features: ['125,000 emails/mo', 'Priority support', 'Dedicated IP included'],
        limits: '125,000 emails/mo',
      },
    ],
    strengths: [
      'Best measured inbox placement in the category',
      '45 days of message history vs 3 on Resend Pro',
      'Fifteen years of operating history',
    ],
    tradeoffs: [
      'Only 10k emails at the $15 tier — 5× less volume per dollar than Resend Pro',
      'No marketing email allowed on the same account',
    ],
    signals: {
      foundedYear: 2010,
      scale: '30,000+ customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'HIPAA available'],
      sentiment: 0.93,
      incidents: [],
    },
  },
  {
    slug: 'mailgun',
    name: 'Mailgun',
    category: 'email-provider',
    url: 'https://mailgun.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'MG',
    brandColor: '#C02537',
    tagline: 'High-volume email infrastructure at scale.',
    description:
      'Enterprise-grade sending infrastructure from Sinch. Deep deliverability tooling and email validation, with pricing that rewards very high volume.',
    tiers: [
      {
        name: 'Basic',
        price: 15,
        cycle: 'monthly',
        unit: 'flat',
        features: ['10,000 emails/mo', '1 day log retention', 'Email API + SMTP'],
        limits: '10,000 emails/mo',
      },
      {
        name: 'Foundation',
        price: 35,
        cycle: 'monthly',
        unit: 'flat',
        features: [
          '50,000 emails/mo',
          '5 day log retention',
          'Inbound routing',
          'Email validations',
        ],
        limits: '50,000 emails/mo',
      },
      {
        name: 'Scale',
        price: 90,
        cycle: 'monthly',
        unit: 'flat',
        features: ['100,000 emails/mo', '15 day retention', 'Dedicated IP', 'SSO'],
        limits: '100,000 emails/mo',
      },
    ],
    strengths: [
      'Deepest deliverability tooling and validation APIs',
      'Scales past a million sends without a repricing conversation',
      'Backed by Sinch',
    ],
    tradeoffs: [
      'Dated dashboard and heavier setup',
      '1 day log retention on Basic',
      'Support quality complaints on lower tiers',
    ],
    signals: {
      foundedYear: 2010,
      scale: '100,000+ customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001'],
      sentiment: 0.79,
      incidents: ['Reported support responsiveness issues on entry tiers'],
    },
  },
  {
    slug: 'sendgrid',
    name: 'SendGrid',
    category: 'email-provider',
    url: 'https://sendgrid.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'SG',
    brandColor: '#1A82E2',
    tagline: 'The incumbent email platform, now part of Twilio.',
    description:
      'The category incumbent. Combines transactional sending with marketing campaigns and the widest set of platform integrations.',
    tiers: [
      {
        name: 'Essentials 50k',
        price: 19.95,
        cycle: 'monthly',
        unit: 'flat',
        features: ['50,000 emails/mo', '3 day history', 'Ticket support'],
        limits: '50,000 emails/mo',
      },
      {
        name: 'Pro 100k',
        price: 89.95,
        cycle: 'monthly',
        unit: 'flat',
        features: ['100,000 emails/mo', 'Dedicated IP', 'Subuser management', 'Phone support'],
        limits: '100,000 emails/mo',
      },
    ],
    strengths: [
      'Widest integration surface of any provider',
      'Transactional and marketing on one bill',
      'Twilio-scale reliability',
    ],
    tradeoffs: [
      'Shared IP pools have a mixed deliverability reputation',
      'Account reviews can suspend sending without much warning',
      'No dedicated IP below $89.95',
    ],
    signals: {
      foundedYear: 2009,
      scale: '80,000+ customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001', 'HIPAA available'],
      sentiment: 0.68,
      incidents: [
        'Recurring reports of abrupt account suspensions on new accounts',
        'Shared IP reputation varies by pool',
      ],
    },
  },

  // ── AI code assistant ──────────────────────────────────────
  {
    slug: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'ai-code-assistant',
    url: 'https://github.com/features/copilot',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'GH',
    brandColor: '#24292F',
    tagline: 'The default AI pair programmer, inside every major editor.',
    description:
      'Microsoft-backed assistant with completions, chat and agent mode across VS Code, JetBrains, Neovim and the GitHub web UI. Enterprise-grade policy controls.',
    tiers: [
      {
        name: 'Free',
        price: 0,
        cycle: 'monthly',
        unit: 'per user',
        features: ['2,000 completions/mo', '50 chat requests/mo'],
        limits: '2,000 completions/mo',
      },
      {
        name: 'Pro',
        price: 10,
        cycle: 'monthly',
        unit: 'per user / month',
        features: [
          'Unlimited completions',
          'Agent mode + multi-file edits',
          'Works in VS Code, JetBrains, Neovim, Xcode',
          'Code referencing filter',
        ],
      },
      {
        name: 'Business',
        price: 19,
        cycle: 'monthly',
        unit: 'per user / month',
        features: [
          'Everything in Pro',
          'Org-wide policy management',
          'Audit logs',
          'IP indemnity',
          'Excluded files',
        ],
      },
    ],
    strengths: [
      'Cheapest credible option at $10/user',
      'Broadest editor coverage — no one has to switch tools',
      'IP indemnity on Business tier',
    ],
    tradeoffs: [
      'Agentic editing is less aggressive than Cursor',
      'Policy controls require the $19 Business tier',
    ],
    signals: {
      foundedYear: 2021,
      scale: '20M+ users, 77,000+ organisations',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001', 'IP indemnification'],
      sentiment: 0.9,
      incidents: [],
    },
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    category: 'ai-code-assistant',
    url: 'https://cursor.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'CU',
    brandColor: '#000000',
    tagline: 'The AI-first editor developers actually switch to.',
    description:
      'A VS Code fork rebuilt around agentic editing. Best-in-class multi-file refactors and codebase-wide context, at the cost of adopting a new editor.',
    tiers: [
      {
        name: 'Hobby',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['Limited agent requests', 'Limited tab completions'],
        limits: 'Trial-level usage',
      },
      {
        name: 'Pro',
        price: 20,
        cycle: 'monthly',
        unit: 'per user / month',
        features: [
          'Extended agent limits',
          'Unlimited tab completions',
          'Background agents',
          'Bug bot',
        ],
      },
      {
        name: 'Teams',
        price: 40,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['Org-wide privacy mode', 'SAML SSO', 'Centralised billing', 'Usage analytics'],
      },
    ],
    strengths: [
      'Strongest multi-file agentic editing in the category',
      'Codebase-wide context out of the box',
      'Fast release cadence',
    ],
    tradeoffs: [
      'Requires switching editors — a real cost for a JetBrains shop',
      '2× the price of Copilot Pro',
      'Heavy usage can hit rate limits mid-sprint',
    ],
    signals: {
      foundedYear: 2022,
      scale: '1M+ developers',
      compliance: ['SOC 2 Type II', 'GDPR', 'Privacy mode (zero retention)'],
      sentiment: 0.88,
      incidents: ['Pricing model changed mid-2025, surprising some subscribers'],
    },
  },
  {
    slug: 'windsurf',
    name: 'Windsurf',
    category: 'ai-code-assistant',
    url: 'https://windsurf.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'WS',
    brandColor: '#09B6A2',
    tagline: 'Agentic IDE with the most generous entry tier.',
    description:
      'Agentic editor (formerly Codeium) with strong free limits and a self-hosted option for teams with strict code-residency requirements.',
    tiers: [
      {
        name: 'Free',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['25 prompt credits/mo', 'Unlimited fast tab completion'],
      },
      {
        name: 'Pro',
        price: 15,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['500 prompt credits/mo', 'Full agentic Cascade', 'Model choice'],
      },
      {
        name: 'Teams',
        price: 30,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['Admin dashboard', 'SSO', 'Zero data retention', 'Self-hosted option'],
      },
    ],
    strengths: [
      'Self-hosted deployment available',
      'Cheapest agentic editor at $15',
      'Unlimited tab completion even on free',
    ],
    tradeoffs: [
      'Credit system makes monthly cost hard to predict',
      'Smaller extension ecosystem than VS Code proper',
    ],
    signals: {
      foundedYear: 2021,
      scale: '800,000+ developers',
      compliance: ['SOC 2 Type II', 'FedRAMP High (gov offering)', 'Zero data retention'],
      sentiment: 0.83,
      incidents: ['Ownership changed hands in 2025 following an acquisition process'],
    },
  },
  {
    slug: 'tabnine',
    name: 'Tabnine',
    category: 'ai-code-assistant',
    url: 'https://tabnine.com',
    countryCode: 'IL',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'TN',
    brandColor: '#6C40F7',
    tagline: 'Privacy-first completions with permissive-only training data.',
    description:
      'Built for regulated teams: models trained exclusively on permissively licensed code, with air-gapped deployment available.',
    tiers: [
      {
        name: 'Dev',
        price: 9,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['AI chat + completions', 'Permissive-only model option'],
      },
      {
        name: 'Enterprise',
        price: 39,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['Air-gapped / on-prem', 'Custom model training', 'SSO + admin controls'],
      },
    ],
    strengths: [
      'Zero-retention and air-gapped options',
      'Provenance guarantees on training data',
      'Lowest list price of the shortlist',
    ],
    tradeoffs: [
      'Completion quality trails Copilot and Cursor',
      'Weak agentic / multi-file editing',
    ],
    signals: {
      foundedYear: 2018,
      scale: '1M+ developers',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001', 'Air-gapped deployment'],
      sentiment: 0.74,
      incidents: [],
    },
  },

  // ── Design tool ────────────────────────────────────────────
  {
    slug: 'figma',
    name: 'Figma',
    category: 'design-tool',
    url: 'https://figma.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'FG',
    brandColor: '#F24E1E',
    tagline: 'The industry standard for collaborative interface design.',
    description:
      'Browser-based design, prototyping and dev handoff. Effectively the default: your next designer already knows it.',
    tiers: [
      {
        name: 'Starter',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['3 design files', 'Unlimited viewers'],
        limits: '3 files',
      },
      {
        name: 'Professional',
        price: 15,
        cycle: 'monthly',
        unit: 'per editor / month',
        features: ['Unlimited files', 'Shared libraries', 'Dev Mode', 'Version history'],
      },
      {
        name: 'Organization',
        price: 45,
        cycle: 'monthly',
        unit: 'per editor / month',
        features: ['Org-wide libraries', 'Design system analytics', 'SSO', 'Branching'],
      },
    ],
    strengths: [
      'Zero onboarding cost — every designer knows it',
      'Dev Mode removes the handoff step entirely',
      'Free viewer seats mean the whole team can comment',
    ],
    tradeoffs: ['Per-editor pricing adds up fast', 'Overkill if nobody designs full time'],
    signals: {
      foundedYear: 2012,
      scale: '13M+ users',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001'],
      sentiment: 0.92,
      incidents: [],
    },
  },
  {
    slug: 'sketch',
    name: 'Sketch',
    category: 'design-tool',
    url: 'https://sketch.com',
    countryCode: 'NL',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'SK',
    brandColor: '#F7B500',
    tagline: 'Native Mac design with a one-time licence option.',
    description:
      'Mac-native design app with a genuinely fast canvas and the only licence-not-subscription option in the category.',
    tiers: [
      {
        name: 'Standard',
        price: 12,
        cycle: 'monthly',
        unit: 'per editor / month',
        features: ['Mac app + web viewer', 'Unlimited documents', 'Shared libraries'],
      },
      {
        name: 'Mac-only licence',
        price: 120,
        cycle: 'one_time',
        unit: 'one-time, per seat',
        features: ['Perpetual Mac app licence', '1 year of updates'],
      },
    ],
    strengths: [
      'Perpetual licence available — no recurring cost',
      'Fastest native canvas on macOS',
      'EU-domiciled vendor',
    ],
    tradeoffs: [
      'Mac only — Windows or Linux designers are locked out',
      'Real-time collaboration lags Figma',
      'Smaller plugin ecosystem',
    ],
    signals: {
      foundedYear: 2010,
      scale: '1M+ designers',
      compliance: ['GDPR', 'EU data residency'],
      sentiment: 0.8,
      incidents: [],
    },
  },
  {
    slug: 'penpot',
    name: 'Penpot',
    category: 'design-tool',
    url: 'https://penpot.app',
    countryCode: 'ES',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'PP',
    brandColor: '#7B61FF',
    tagline: 'Open-source design that speaks native CSS.',
    description:
      'Open-source, self-hostable design platform built on web standards, so what designers draw maps directly to CSS flex and grid.',
    tiers: [
      {
        name: 'Community',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['Unlimited projects', 'Self-hostable', 'Open source'],
      },
      {
        name: 'Enterprise',
        price: 7,
        cycle: 'monthly',
        unit: 'per editor / month',
        features: ['Managed hosting', 'SSO', 'Priority support'],
      },
    ],
    strengths: [
      'Free and self-hostable — no vendor lock-in',
      'Designs export as real CSS layout',
      'No per-editor tax on the community edition',
    ],
    tradeoffs: [
      'Smaller talent pool familiar with it',
      'Prototyping is behind Figma',
      'Self-hosting is real ops work',
    ],
    signals: {
      foundedYear: 2020,
      scale: '600,000+ users',
      compliance: ['GDPR', 'Self-hosted option', 'MPL-2.0 licence'],
      sentiment: 0.81,
      incidents: [],
    },
  },

  // ── Product analytics ──────────────────────────────────────
  {
    slug: 'posthog',
    name: 'PostHog',
    category: 'product-analytics',
    url: 'https://posthog.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'PH',
    brandColor: '#F54E00',
    tagline: 'Analytics, session replay and flags in one bill.',
    description:
      'Open-source product suite: analytics, session replay, feature flags, experiments and surveys, priced per event with a large free allowance.',
    tiers: [
      {
        name: 'Free',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['1M events/mo', '5k session replays/mo', 'Feature flags', 'All products'],
        limits: '1M events/mo',
      },
      {
        name: 'Pay-as-you-go',
        price: 25,
        cycle: 'monthly',
        unit: 'typical startup spend',
        features: ['Usage-based past the free tier', 'Session replay', 'Experiments', 'Data export'],
      },
      {
        name: 'Teams',
        price: 450,
        cycle: 'monthly',
        unit: 'flat + usage',
        features: ['SSO', 'Advanced permissions', 'Priority support'],
      },
    ],
    strengths: [
      'Four tools on one bill — replaces separate replay and flag vendors',
      '1M free events covers most seed-stage products',
      'Self-hostable',
    ],
    tradeoffs: [
      'Usage pricing is hard to forecast in a spiky month',
      'Dashboards are less polished than Amplitude',
    ],
    signals: {
      foundedYear: 2020,
      scale: '100,000+ companies',
      compliance: ['SOC 2 Type II', 'GDPR', 'HIPAA available'],
      sentiment: 0.91,
      incidents: [],
    },
  },
  {
    slug: 'mixpanel',
    name: 'Mixpanel',
    category: 'product-analytics',
    url: 'https://mixpanel.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'MP',
    brandColor: '#7856FF',
    tagline: 'Event analytics with the friendliest query builder.',
    description:
      'Focused event analytics: funnels, retention and cohorts that a non-technical founder can actually build without SQL.',
    tiers: [
      {
        name: 'Free',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['1M events/mo', 'Core reports'],
        limits: '1M events/mo',
      },
      {
        name: 'Growth',
        price: 20,
        cycle: 'monthly',
        unit: 'from, usage-scaled',
        features: ['Unlimited saved reports', 'Impact report', 'Experiments', 'Data pipelines add-on'],
      },
      {
        name: 'Enterprise',
        price: 833,
        cycle: 'monthly',
        unit: 'from',
        features: ['SSO + SAML', 'Data governance', 'Dedicated support'],
      },
    ],
    strengths: [
      'Fastest report building for non-engineers',
      'Mature funnel and retention analysis',
      'Generous free tier',
    ],
    tradeoffs: [
      'Analytics only — you still buy replay and flags elsewhere',
      'Growth tier price climbs steeply with event volume',
    ],
    signals: {
      foundedYear: 2009,
      scale: '20,000+ paying customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001', 'HIPAA available'],
      sentiment: 0.85,
      incidents: ['2021 pricing model change forced many teams to re-plan budgets'],
    },
  },
  {
    slug: 'amplitude',
    name: 'Amplitude',
    category: 'product-analytics',
    url: 'https://amplitude.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'AM',
    brandColor: '#1E61F0',
    tagline: 'Enterprise-grade behavioural analytics.',
    description:
      'The most rigorous analysis engine of the three, with behavioural cohorting and predictive modelling aimed at larger product organisations.',
    tiers: [
      {
        name: 'Starter',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['50k monthly tracked users', 'Core analytics'],
        limits: '50k MTUs',
      },
      {
        name: 'Plus',
        price: 49,
        cycle: 'monthly',
        unit: 'from',
        features: ['300k events/mo', 'Experiment results', 'Custom dashboards'],
      },
    ],
    strengths: [
      'Deepest behavioural analysis engine',
      'Predictive cohorts out of the box',
      'Strong enterprise governance',
    ],
    tradeoffs: [
      'Most expensive entry point in the category',
      'Complexity is wasted on a pre-PMF product',
    ],
    signals: {
      foundedYear: 2012,
      scale: '3,000+ paying customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001', 'HIPAA'],
      sentiment: 0.82,
      incidents: [],
    },
  },

  // ── Error monitoring ───────────────────────────────────────
  {
    slug: 'sentry',
    name: 'Sentry',
    category: 'error-monitoring',
    url: 'https://sentry.io',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'SN',
    brandColor: '#362D59',
    tagline: 'The default error tracker, with tracing and replay attached.',
    description:
      'Exception tracking, performance tracing, session replay and cron monitoring in one product, with SDKs for effectively every runtime.',
    tiers: [
      {
        name: 'Developer',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['5k errors/mo', '1 user', 'Basic integrations'],
        limits: '5k errors/mo',
      },
      {
        name: 'Team',
        price: 26,
        cycle: 'monthly',
        unit: 'flat + usage',
        features: [
          '50k errors/mo',
          'Unlimited users',
          'Performance tracing',
          'Session replay',
          'Alerting + integrations',
        ],
      },
      {
        name: 'Business',
        price: 80,
        cycle: 'monthly',
        unit: 'flat + usage',
        features: ['Advanced quota management', 'SSO', 'Custom dashboards', 'Code owners routing'],
      },
    ],
    strengths: [
      'Unlimited seats on the $26 tier',
      'Errors, tracing and replay on one bill',
      'Open source, self-hostable',
    ],
    tradeoffs: [
      'Usage overages need watching',
      'Noisy by default until alert rules are tuned',
    ],
    signals: {
      foundedYear: 2012,
      scale: '4M+ developers, 100,000+ organisations',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001', 'HIPAA available'],
      sentiment: 0.89,
      incidents: [],
    },
  },
  {
    slug: 'rollbar',
    name: 'Rollbar',
    category: 'error-monitoring',
    url: 'https://rollbar.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'RB',
    brandColor: '#51A5CF',
    tagline: 'Error grouping that stays quiet until it matters.',
    description:
      'Focused error tracking with strong automatic grouping and workflow triggers. Simpler surface area than Sentry.',
    tiers: [
      {
        name: 'Free',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['5k events/mo', '30 day retention'],
        limits: '5k events/mo',
      },
      {
        name: 'Essentials',
        price: 21,
        cycle: 'monthly',
        unit: 'flat',
        features: ['25k events/mo', 'Unlimited users', 'Custom grouping', 'Integrations'],
      },
      {
        name: 'Advanced',
        price: 99,
        cycle: 'monthly',
        unit: 'flat',
        features: ['100k events/mo', 'SSO', 'Extended retention', 'Priority support'],
      },
    ],
    strengths: [
      'Cheapest paid tier in the category',
      'Best-in-class automatic error grouping',
      'Unlimited users included',
    ],
    tradeoffs: [
      'No session replay',
      'Performance tracing is thin compared to Sentry',
      'Smaller integration catalogue',
    ],
    signals: {
      foundedYear: 2012,
      scale: '5,000+ customers',
      compliance: ['SOC 2 Type II', 'GDPR'],
      sentiment: 0.8,
      incidents: [],
    },
  },
  {
    slug: 'bugsnag',
    name: 'Bugsnag',
    category: 'error-monitoring',
    url: 'https://smartbear.com/product/bugsnag',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'BS',
    brandColor: '#4949E7',
    tagline: 'Release health scoring for mobile-heavy teams.',
    description:
      'Now SmartBear Insight Hub. Strongest story for native mobile crash reporting and per-release stability scores.',
    tiers: [
      {
        name: 'Free',
        price: 0,
        cycle: 'monthly',
        unit: 'flat',
        features: ['7.5k events/mo', '1 user'],
        limits: '7.5k events/mo',
      },
      {
        name: 'Standard',
        price: 59,
        cycle: 'monthly',
        unit: 'flat',
        features: ['150k events/mo', 'Release health', 'Unlimited users', 'Mobile crash symbols'],
      },
    ],
    strengths: [
      'Best native mobile crash reporting',
      'Release stability scores built in',
      'Highest event allowance per dollar at the paid tier',
    ],
    tradeoffs: [
      'Entry paid tier is 2× Sentry Team',
      'Web/backend story is weaker than its mobile one',
    ],
    signals: {
      foundedYear: 2013,
      scale: '6,000+ customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001'],
      sentiment: 0.76,
      incidents: ['Product renamed and repackaged after the SmartBear acquisition'],
    },
  },

  // ── Password manager ───────────────────────────────────────
  {
    slug: '1password',
    name: '1Password',
    category: 'password-manager',
    url: 'https://1password.com',
    countryCode: 'CA',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: '1P',
    brandColor: '#0572EC',
    tagline: 'The polished default for team credential management.',
    description:
      'Shared vaults, developer secret injection and device trust, with the best-reviewed apps in the category.',
    tiers: [
      {
        name: 'Teams Starter Pack',
        price: 19.95,
        cycle: 'monthly',
        unit: 'flat, up to 10 users',
        features: ['Up to 10 team members', 'Shared vaults', 'Admin controls', '24/7 support'],
        limits: '10 users',
      },
      {
        name: 'Business',
        price: 7.99,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['Unlimited vaults', 'SSO with Okta/Entra', 'Advanced reporting', 'Secrets automation'],
      },
    ],
    strengths: [
      'Flat $19.95 for the first 10 people — unbeatable at small headcount',
      'Best apps and browser extension in the category',
      'CLI and secret injection for CI',
    ],
    tradeoffs: [
      'Per-user price is 2× Bitwarden once you outgrow the starter pack',
      'Closed source',
    ],
    signals: {
      foundedYear: 2005,
      scale: '150,000+ business customers',
      compliance: ['SOC 2 Type II', 'ISO 27001', 'GDPR', 'Annual third-party audits'],
      sentiment: 0.93,
      incidents: [],
    },
  },
  {
    slug: 'bitwarden',
    name: 'Bitwarden',
    category: 'password-manager',
    url: 'https://bitwarden.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'BW',
    brandColor: '#175DDC',
    tagline: 'Open-source vaults at half the price.',
    description:
      'Fully open-source and independently audited, self-hostable, and the cheapest credible per-seat option.',
    tiers: [
      {
        name: 'Teams',
        price: 4,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['Shared collections', 'Event logs', 'Directory sync', 'Self-host option'],
      },
      {
        name: 'Enterprise',
        price: 6,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['SSO with SAML/OIDC', 'Enterprise policies', 'Secrets Manager', 'Account recovery'],
      },
    ],
    strengths: [
      'Half the per-seat price of 1Password Business',
      'Open source with published third-party audits',
      'Self-hostable for strict data residency',
    ],
    tradeoffs: [
      'Apps and extension are less refined',
      'Onboarding non-technical staff takes more hand-holding',
    ],
    signals: {
      foundedYear: 2016,
      scale: '50,000+ business customers',
      compliance: ['SOC 2 Type II', 'ISO 27001', 'GDPR', 'HIPAA', 'Open source audits'],
      sentiment: 0.9,
      incidents: [],
    },
  },
  {
    slug: 'dashlane',
    name: 'Dashlane',
    category: 'password-manager',
    url: 'https://dashlane.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'DL',
    brandColor: '#0E353D',
    tagline: 'Credential management with dark-web monitoring built in.',
    description:
      'Team password management bundled with breach monitoring and a phishing-alert layer aimed at non-technical staff.',
    tiers: [
      {
        name: 'Business',
        price: 8,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['SSO included', 'Dark web monitoring', 'Admin console', 'Confidential SSO'],
      },
      {
        name: 'Business Plus',
        price: 10.5,
        cycle: 'monthly',
        unit: 'per user / month',
        features: ['Everything in Business', 'Advanced provisioning', 'Custom policies'],
      },
    ],
    strengths: [
      'SSO included at the base business tier',
      'Dark-web monitoring bundled',
      'Simplest admin console for non-technical owners',
    ],
    tradeoffs: ['Most expensive per seat', 'No self-hosting', 'Weakest developer tooling'],
    signals: {
      foundedYear: 2009,
      scale: '20,000+ businesses',
      compliance: ['SOC 2 Type II', 'ISO 27001', 'GDPR'],
      sentiment: 0.78,
      incidents: [],
    },
  },

  // ── Customer support ───────────────────────────────────────
  {
    slug: 'intercom',
    name: 'Intercom',
    category: 'customer-support',
    url: 'https://intercom.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'IC',
    brandColor: '#1F8DED',
    tagline: 'Support platform with an AI agent that resolves tickets.',
    description:
      'Messenger, helpdesk and the Fin AI agent, which resolves a large share of conversations before a human sees them.',
    tiers: [
      {
        name: 'Essential',
        price: 39,
        cycle: 'monthly',
        unit: 'per seat / month',
        features: ['Shared inbox', 'Messenger', 'Public help centre', 'Basic automation'],
      },
      {
        name: 'Advanced',
        price: 99,
        cycle: 'monthly',
        unit: 'per seat / month',
        features: ['Workflow automation', 'Multiple inboxes', 'SLA rules', 'Round robin'],
      },
    ],
    strengths: [
      'Fin AI agent deflects a meaningful share of tickets',
      'Best-in-class in-app messenger',
      'Deep product-tour and onboarding tooling',
    ],
    tradeoffs: [
      'Most expensive per seat',
      'Fin resolutions are billed on top, per resolution',
      'Overkill before you have real support volume',
    ],
    signals: {
      foundedYear: 2011,
      scale: '25,000+ customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001', 'HIPAA available'],
      sentiment: 0.77,
      incidents: ['Repeated pricing model changes; usage-based Fin billing surprised some teams'],
    },
  },
  {
    slug: 'front',
    name: 'Front',
    category: 'customer-support',
    url: 'https://front.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'FR',
    brandColor: '#001B38',
    tagline: 'Shared inbox that still feels like email.',
    description:
      'Collaborative inbox where support, sales and ops handle shared addresses without learning ticket-speak.',
    tiers: [
      {
        name: 'Starter',
        price: 19,
        cycle: 'monthly',
        unit: 'per seat / month',
        features: ['Shared inboxes', 'Comments + assignments', 'Basic rules'],
        limits: 'Up to 10 seats',
      },
      {
        name: 'Growth',
        price: 59,
        cycle: 'monthly',
        unit: 'per seat / month',
        features: ['Advanced rules', 'Analytics', 'Live chat', 'API access'],
      },
    ],
    strengths: [
      'Cheapest entry seat in the category',
      'Zero training cost — it is just email with comments',
      'Works for sales and ops inboxes too',
    ],
    tradeoffs: [
      'Starter caps at 10 seats',
      'No AI deflection at the entry tier',
      'Knowledge base is an add-on',
    ],
    signals: {
      foundedYear: 2013,
      scale: '9,000+ companies',
      compliance: ['SOC 2 Type II', 'GDPR', 'ISO 27001'],
      sentiment: 0.86,
      incidents: [],
    },
  },
  {
    slug: 'help-scout',
    name: 'Help Scout',
    category: 'customer-support',
    url: 'https://helpscout.com',
    countryCode: 'US',
    mcc: '7372',
    mccLabel: 'Computer Software',
    initials: 'HS',
    brandColor: '#1292EE',
    tagline: 'Human-feeling support, priced per contact.',
    description:
      'Helpdesk, docs site and chat with contact-based pricing, so adding teammates does not add cost.',
    tiers: [
      {
        name: 'Standard',
        price: 50,
        cycle: 'monthly',
        unit: 'flat, 100 contacts',
        features: ['Unlimited users', 'Docs knowledge base', 'Live chat', 'Workflows'],
        limits: '100 contacts/mo',
      },
      {
        name: 'Plus',
        price: 75,
        cycle: 'monthly',
        unit: 'flat, 100 contacts',
        features: ['Custom fields', 'Salesforce/HubSpot sync', 'Advanced permissions', 'API'],
      },
    ],
    strengths: [
      'Unlimited seats — the whole company can answer tickets',
      'Knowledge base included, not an add-on',
      'Replies read like normal email to the customer',
    ],
    tradeoffs: [
      'Contact-based pricing punishes a high-volume, low-value user base',
      'Automation is thinner than Intercom',
    ],
    signals: {
      foundedYear: 2011,
      scale: '12,000+ customers',
      compliance: ['SOC 2 Type II', 'GDPR', 'HIPAA available'],
      sentiment: 0.88,
      incidents: [],
    },
  },
];

// ── Lookup helpers ───────────────────────────────────────────

export function getVendor(slug: string): Vendor | undefined {
  return VENDORS.find((v) => v.slug === slug);
}

export function vendorsInCategory(category: string): Vendor[] {
  return VENDORS.filter((v) => v.category === category);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/**
 * Maps free-text ("code editor AI", "something to send emails") onto a
 * category slug. Scores alias overlap so longer, more specific aliases win
 * over incidental single-word matches.
 */
export function resolveCategory(query: string): Category | undefined {
  const q = query.toLowerCase();

  let best: { category: Category; score: number } | undefined;

  for (const category of CATEGORIES) {
    let score = 0;

    if (q.includes(category.slug.replace(/-/g, ' '))) score += 12;
    if (q.includes(category.label.toLowerCase())) score += 10;

    for (const alias of category.aliases) {
      if (q.includes(alias)) score += alias.split(' ').length * 3 + 1;
    }

    // A named vendor is the strongest possible signal of category.
    for (const vendor of VENDORS) {
      if (vendor.category === category.slug && q.includes(vendor.name.toLowerCase())) {
        score += 8;
      }
    }

    if (score > 0 && (!best || score > best.score)) best = { category, score };
  }

  return best?.category;
}

/** Pulls a monthly budget out of "under $40/month", "$25 a month", "40 dollars". */
export function extractBudget(query: string): number | null {
  const patterns = [
    /(?:under|below|less than|max|maximum|up to|budget of|within)\s*\$?\s*(\d+(?:\.\d+)?)/i,
    /\$\s*(\d+(?:\.\d+)?)\s*(?:\/|per|a)\s*(?:mo|month)/i,
    /\$\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:dollars|usd)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const value = Number.parseFloat(match[1]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }

  return null;
}

/** Seat count for per-user tools: "for our 5 designers", "3 seats". */
export function extractSeats(query: string): number {
  const match = query.match(/(\d+)\s*(?:seats?|users?|people|devs?|developers?|designers?|engineers?)/i);
  if (match) {
    const n = Number.parseInt(match[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 500) return n;
  }
  return 1;
}
