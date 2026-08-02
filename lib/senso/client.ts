import type { TrustReport, Vendor } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Merchant trust.
//
// When SENSO_API_KEY is set we ask Senso to verify the merchant and fold its
// answer into the score. Without a key — and whenever the call fails or times
// out — we fall back to a transparent local model built from the catalog's
// published signals. A trust check must never be the thing that stalls a
// live demo, so the fallback is the default path, not an error path.
// ─────────────────────────────────────────────────────────────

const SENSO_TIMEOUT_MS = 4_000;

interface SensoResponse {
  score?: number;
  trust_score?: number;
  confidence?: number;
  sources?: { name?: string; title?: string; url?: string; snippet?: string }[];
  warnings?: string[];
  summary?: string;
}

export function sensoConfigured() {
  return Boolean(process.env.SENSO_API_KEY);
}

/**
 * Local trust model. Deliberately simple and explainable: every point on the
 * score traces back to a signal we can show the user.
 */
function localTrust(vendor: Vendor): TrustReport {
  const { signals } = vendor;
  const yearsOperating = new Date().getFullYear() - signals.foundedYear;

  // Longevity — up to 15 points, saturating at 10 years. Capped low on
  // purpose: a young vendor with real certifications should still be able to
  // clear the trust bar.
  const longevity = Math.min(15, Math.round((yearsOperating / 10) * 15));

  // Compliance — up to 30 points. SOC 2 and ISO carry the most weight
  // because they are the two a startup's own customers will ask about.
  const complianceWeights: Record<string, number> = {
    'soc 2 type ii': 12,
    'iso 27001': 8,
    gdpr: 5,
    hipaa: 5,
  };
  let compliance = 0;
  for (const item of signals.compliance) {
    const key = item.toLowerCase();
    for (const [needle, weight] of Object.entries(complianceWeights)) {
      if (key.includes(needle)) compliance += weight;
    }
    if (compliance === 0 && key.includes('audit')) compliance += 4;
  }
  compliance = Math.min(30, compliance);

  // Public sentiment — up to 35 points.
  const sentiment = Math.round(signals.sentiment * 35);

  // Scale — up to 20 points, from the order of magnitude of the customer base.
  const scale = Math.min(20, Math.round(Math.log10(Math.max(parseScale(signals.scale), 10)) * 4));

  // Each unresolved public incident costs 5 points.
  const penalty = signals.incidents.length * 5;

  const score = Math.max(0, Math.min(100, longevity + compliance + sentiment + scale - penalty));

  const verifiedSources = [
    {
      name: `${vendor.name} — security & compliance`,
      url: `${vendor.url}/security`,
      note: signals.compliance.join(' · ') || 'No published certifications found',
    },
    {
      name: 'Public review aggregate',
      url: `https://www.g2.com/search?query=${encodeURIComponent(vendor.name)}`,
      note: `${Math.round(signals.sentiment * 100)}% positive sentiment across public reviews`,
    },
    {
      name: 'Company record',
      url: vendor.url,
      note: `Operating since ${signals.foundedYear} · ${signals.scale}`,
    },
  ];

  return {
    slug: vendor.slug,
    vendor: vendor.name,
    score,
    ...band(score),
    verifiedSources,
    warnings: signals.incidents,
    provider: 'local',
  };
}

/**
 * Reads the leading magnitude out of a scale string: "20M+ users, 77,000+
 * organisations" → 20,000,000. Only the first number counts, so trailing
 * secondary figures cannot inflate the result.
 */
function parseScale(scale: string): number {
  const match = scale.match(/([\d][\d,.]*)\s*([MK])?/i);
  if (!match) return 0;

  const value = Number.parseFloat(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return 0;

  const suffix = match[2]?.toUpperCase();
  if (suffix === 'M') return value * 1_000_000;
  if (suffix === 'K') return value * 1_000;
  return value;
}

function band(score: number): { band: TrustReport['band']; label: string } {
  if (score >= 85) return { band: 'trusted', label: 'Trusted merchant' };
  if (score >= 70) return { band: 'established', label: 'Established merchant' };
  return { band: 'caution', label: 'Low confidence merchant' };
}

/**
 * Verifies a merchant. Senso's answer, when available, is blended 50/50 with
 * the local model rather than replacing it — the local signals are things we
 * can cite in the UI, and blending keeps a single flaky API call from
 * swinging a purchase recommendation on its own.
 */
export async function checkMerchantTrust(vendor: Vendor): Promise<TrustReport> {
  const local = localTrust(vendor);
  const apiKey = process.env.SENSO_API_KEY;
  if (!apiKey) return local;

  const baseUrl = process.env.SENSO_BASE_URL || 'https://api.senso.ai';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SENSO_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/v1/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `Merchant trust, reliability, security posture and billing complaints for ${vendor.name} (${vendor.url})`,
        max_results: 5,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) return local;

    const data = (await res.json()) as SensoResponse;
    const raw = data.trust_score ?? data.score ?? data.confidence;
    if (typeof raw !== 'number') return local;

    // Senso may answer 0–1 or 0–100; normalise both.
    const sensoScore = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
    const blended = Math.round((sensoScore + local.score) / 2);

    const sensoSources = (data.sources ?? [])
      .filter((s) => s.url)
      .slice(0, 4)
      .map((s) => ({
        name: s.name || s.title || 'Senso verified source',
        url: s.url!,
        note: s.snippet?.slice(0, 140) || 'Verified by Senso',
      }));

    return {
      ...local,
      score: blended,
      ...band(blended),
      verifiedSources: [...sensoSources, ...local.verifiedSources].slice(0, 5),
      warnings: [...(data.warnings ?? []), ...local.warnings],
      provider: 'senso',
    };
  } catch {
    // Network error, timeout, malformed body — the local model still answers.
    return local;
  } finally {
    clearTimeout(timer);
  }
}
