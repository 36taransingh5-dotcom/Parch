import { getInvoice, getPurchase } from '@/lib/store';
import { formatDate, formatMoney } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Renders an invoice as a standalone HTML page — printable to PDF from the
 * browser, which is all a hackathon receipt needs to be.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const invoice = await getInvoice(id);
  if (!invoice) {
    return new Response('Invoice not found', { status: 404 });
  }

  const purchase = await getPurchase(invoice.purchase_id);
  const company = process.env.DEMO_COMPANY_NAME || 'Acme Inc.';
  const billedTo = process.env.DEMO_USER_EMAIL || 'founder@acme.dev';

  const cycle =
    purchase?.billing_cycle === 'annual'
      ? 'Annual'
      : purchase?.billing_cycle === 'one_time'
        ? 'One-time'
        : 'Monthly';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${escapeHtml(invoice.number)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font: 15px/1.6 ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #16181d; background: #f6f7f9; margin: 0; padding: 48px 20px;
  }
  .sheet {
    max-width: 680px; margin: 0 auto; background: #fff; padding: 48px;
    border-radius: 18px; box-shadow: 0 12px 40px -20px rgba(20,22,28,.35);
  }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { font-weight: 640; letter-spacing: -.01em; font-size: 18px; }
  .muted { color: #6b7280; }
  .num { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 13px; }
  h1 { font-size: 13px; letter-spacing: .09em; text-transform: uppercase; color: #6b7280; margin: 40px 0 10px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #eceef1; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; font-weight: 600; }
  td.right, th.right { text-align: right; }
  .total { display: flex; justify-content: space-between; margin-top: 20px; font-size: 20px; font-weight: 620; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #e8f7ee; color: #15803d; font-size: 12px; font-weight: 600; }
  footer { margin-top: 40px; font-size: 12.5px; color: #6b7280; border-top: 1px solid #eceef1; padding-top: 18px; }
  @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; padding: 24px; } }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div>
        <div class="brand">OpsPilot</div>
        <div class="muted">Procurement for ${escapeHtml(company)}</div>
      </div>
      <div style="text-align:right">
        <div class="num">${escapeHtml(invoice.number)}</div>
        <div class="muted">${formatDate(invoice.issued_at)}</div>
        <div style="margin-top:8px"><span class="pill">Paid</span></div>
      </div>
    </header>

    <h1>Billed to</h1>
    <div>${escapeHtml(company)}<br><span class="muted">${escapeHtml(billedTo)}</span></div>

    <h1>Detail</h1>
    <table>
      <thead>
        <tr><th>Description</th><th>Billing</th><th class="right">Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${escapeHtml(purchase?.vendor ?? 'Software')}</strong> — ${escapeHtml(purchase?.product ?? 'Subscription')}
            <div class="muted">${escapeHtml(purchase?.category ?? '')}</div>
          </td>
          <td>${cycle}</td>
          <td class="right">${formatMoney(invoice.amount, invoice.currency)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total"><span>Total</span><span>${formatMoney(invoice.amount, invoice.currency)}</span></div>

    <footer>
      Paid with a single-use network token issued by Prava${purchase?.card_last4 ? ` (••••&nbsp;${escapeHtml(purchase.card_last4)})` : ''}.
      ${purchase?.renewal_date ? `Renews ${formatDate(purchase.renewal_date)}.` : 'No recurring charge.'}
      <br>Approved by ${escapeHtml(billedTo)} · researched and executed by OpsPilot.
    </footer>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
