import { AppSettings, PAYMENT_MODE_LABELS } from "@/frontdesk/lib/store";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import cybersquadLightLogo from "@/frontdesk/assets/cybersquad black.png";
import type { Sale } from "./store";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printSaleReceipt(sale: Sale, settings?: Partial<AppSettings>) {
  if (typeof window === "undefined") return;

  const businessName = settings?.businessName || "Cybersquad Device Services";
  const businessPhone = settings?.businessPhone || "";
  const businessEmail = settings?.businessEmail || "";
  const businessAddress = settings?.businessAddress || "";
  const receiptFooter =
    settings?.receiptFooter || "Thank you for choosing Cybersquad. This receipt was generated electronically.";
  const logoUrl = cybersquadLightLogo;
  const paymentModeLabel = PAYMENT_MODE_LABELS[sale.paymentMode] ?? sale.paymentMode;

  const popup = window.open("", "_blank", "width=960,height=720");
  if (!popup) return;

  const lineRows = sale.lines
    .map(
      (line) => `<tr>
              <td>${escapeHtml(line.name)}${line.sku ? ` <span class="muted">(${escapeHtml(line.sku)})</span>` : ""}</td>
              <td>${line.quantity}</td>
              <td>${escapeHtml(formatCurrency(line.unitPrice))}</td>
              <td>${escapeHtml(formatCurrency(line.unitPrice * line.quantity))}</td>
            </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(sale.saleNumber)}</title>
    <style>
      :root {
        --text: #111827;
        --muted: #6b7280;
        --line: #e5e7eb;
        --accent: #1d4ed8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        font-family: "Outfit", "Segoe UI", sans-serif;
        color: var(--text);
        background: #f8fafc;
      }
      .sheet {
        max-width: 820px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 28px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      h2 {
        margin: 0 0 8px;
        font-size: 18px;
      }
      .brand-logo {
        height: 34px;
        width: auto;
        display: block;
        margin-bottom: 10px;
      }
      p {
        margin: 4px 0;
      }
      .muted {
        color: var(--muted);
      }
      .section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
      }
      .amount {
        font-size: 28px;
        font-weight: 700;
        color: var(--accent);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      th, td {
        text-align: left;
        border-bottom: 1px solid var(--line);
        padding: 10px 0;
      }
      th {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      td:last-child,
      th:last-child {
        text-align: right;
      }
      .footer {
        margin-top: 24px;
        color: var(--muted);
        font-size: 12px;
      }
      @media print {
        body { background: #fff; padding: 0; }
        .sheet { border: none; border-radius: 0; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="row">
        <div>
          <img src="${escapeHtml(logoUrl)}" alt="Cybersquad logo" class="brand-logo" />
          <h1>Sales Receipt</h1>
          <p class="muted">${escapeHtml(businessName)}</p>
          ${businessPhone ? `<p class="muted">${escapeHtml(businessPhone)}</p>` : ""}
          ${businessEmail ? `<p class="muted">${escapeHtml(businessEmail)}</p>` : ""}
          ${businessAddress ? `<p class="muted">${escapeHtml(businessAddress)}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <p><strong>${escapeHtml(sale.saleNumber)}</strong></p>
          <p class="muted">Issued ${escapeHtml(new Date(sale.createdAt).toLocaleString())}</p>
          <p class="muted">Cashier ${escapeHtml(sale.cashierName)}</p>
          <p class="muted">Payment: ${escapeHtml(paymentModeLabel)}</p>
        </div>
      </div>

      <div class="section">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineRows}
          </tbody>
        </table>
      </div>

      <div class="section row">
        <div>
          <p class="muted">Total</p>
        </div>
        <div class="amount">${escapeHtml(formatCurrency(sale.total))}</div>
      </div>

      ${
        sale.paymentMode === "cash" && sale.cashTendered !== undefined
          ? `<div class="row" style="margin-top:8px;">
        <div><p class="muted">Cash Tendered</p></div>
        <div>${escapeHtml(formatCurrency(sale.cashTendered))}</div>
      </div>
      <div class="row" style="margin-top:4px;">
        <div><p class="muted">Change Due</p></div>
        <div>${escapeHtml(formatCurrency(sale.changeDue ?? 0))}</div>
      </div>`
          : ""
      }

      <p class="footer">${escapeHtml(receiptFooter)}</p>
    </div>
    <script>window.onload = () => window.print();</script>
  </body>
</html>`;

  popup.document.write(html);
  popup.document.close();
}
