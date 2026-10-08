// Finance data that lives in Odoo (accounting source of truth). Same approach
// as websiteSales.js: these endpoints do not exist yet, so every reader fails
// soft (null) and the UI says "not available yet" instead of inventing numbers.
// Writers return { ok, ... } so the caller can record a failed sync against the
// record and surface it.
//
// Contract for the Django/Odoo backend (all under /api/v1):
//   GET  /finance/overview/?range=today|1d|3d|7d|30d|90d|all
//        -> { success, result: { receivable, payable, cash_balance, payments_received, pending_payouts, revenue } }
//   GET  /finance/receivables/?range=&q=
//        -> { success, result: [{ id, customer, reference, amount, balance, issue_date, due_date, status }] }
//        status: outstanding | partially_paid | paid | overdue (derived from Odoo account.move payment_state + due date)
//   GET  /finance/payables/?range=&q=   (vendor bills, same shape with `vendor`)
//   POST /finance/cod-settlements/      body: Settlement (below). IDEMPOTENT on `external_ref`:
//        re-posting an existing external_ref must return the existing Odoo record, never create a second invoice.
//        -> { success, result: { odoo_ref } }
//   POST /finance/cod-settlements/{external_ref}/payments/   body: { external_ref, reference, amount, paid_on, notes }
//        Idempotent on the payment's external_ref; reconciles against the settlement's invoice.
//        -> { success, result: { odoo_ref, reconciled: boolean } }
//   GET  /odoo/sync-queue/ and POST /odoo/sync-queue/{id}/retry/  (already in the work plan)

const unwrap = (res) => (res?.data?.success ? res.data.result : null);
const failMessage = (error) =>
  error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Odoo sync failed.";

async function read(api, url, params) {
  try {
    return unwrap(await api.get(url, { params, showLoader: false }));
  } catch {
    return null;
  }
}

export const fetchFinanceOverview = (api, range = "30d") => read(api, "/finance/overview/", { range });
export const fetchReceivables = (api, params = {}) => read(api, "/finance/receivables/", params);
export const fetchPayables = (api, params = {}) => read(api, "/finance/payables/", params);

async function write(api, url, body) {
  try {
    const result = unwrap(await api.post(url, body, { showLoader: false }));
    if (!result) return { ok: false, error: "Odoo did not confirm the record." };
    return { ok: true, odooRef: result.odoo_ref, reconciled: result.reconciled };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export const syncSettlementToOdoo = (api, settlement) =>
  write(api, "/finance/cod-settlements/", {
    external_ref: settlement.reference,
    courier: settlement.courier,
    period_from: settlement.periodFrom,
    period_to: settlement.periodTo,
    gross: settlement.gross,
    fees: settlement.fees,
    net: settlement.net,
    due_on: settlement.dueOn,
    orders: settlement.lines.map((line) => ({ sale_ref: line.saleNumber, amount: line.amount, fee: line.fee })),
  });

export const syncSettlementPaymentToOdoo = (api, settlement, payment) =>
  write(api, `/finance/cod-settlements/${encodeURIComponent(settlement.reference)}/payments/`, {
    external_ref: `${settlement.reference}:${payment.reference}`,
    reference: payment.reference,
    amount: payment.amount,
    paid_on: payment.paidOn,
    notes: payment.notes ?? "",
  });
