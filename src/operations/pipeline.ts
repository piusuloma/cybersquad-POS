import { createSale, readFromStorage, writeToStorage, withSaleLock } from "@/pos/lib/store";
import { generateId } from "@/frontdesk/lib/store";
import type { SaleCustomer } from "@/pos/lib/devices";

// Prototype data for quotes, sourcing requests and branch transfers. Stored locally like the rest of the
// operations module; stock per branch is fixed sample data, adjusted only by transfers recorded here.
export const QUOTE_DISCOUNT_LIMIT_PERCENT = 10;
export const BRANCHES = ["Ikeja", "Lekki", "Abuja"];
export const SAMPLE_BRANCH_STOCK: { sku: string; name: string; stock: Record<string, number> }[] = [
  { sku: "SAMPLE-IP13", name: "Sample iPhone 13 - 128GB", stock: { Ikeja: 0, Lekki: 4, Abuja: 2 } },
  { sku: "SAMPLE-LAPTOP", name: "Sample laptop - 16GB / 512GB", stock: { Ikeja: 1, Lekki: 0, Abuja: 0 } },
  { sku: "SAMPLE-CABLE", name: "Sample USB-C cable", stock: { Ikeja: 20, Lekki: 8, Abuja: 0 } },
];

export interface HistoryEntry { at: string; by: string; change: string; }
export interface QuoteLine { name: string; quantity: number; unitPrice: number; }
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export interface Quote {
  id: string; number: string; customer: SaleCustomer; lines: QuoteLine[]; discount: number; total: number;
  validUntil: string; status: QuoteStatus; owner: string; note?: string; enquiryId?: string; sourcingId?: string;
  saleId?: string; declineReason?: string; createdAt: string; updatedAt: string; history: HistoryEntry[];
}
export type SourcingStatus = "requested" | "quoted" | "quote_created" | "closed";
export interface SourcingRequest {
  id: string; number: string; customer: SaleCustomer; product: string; spec: string; quantity: number;
  status: SourcingStatus; requestedBy: string; enquiryId?: string; quotedPrice?: number; expectedAvailability?: string;
  procurementNote?: string; quoteId?: string; closedReason?: string; createdAt: string; updatedAt: string; history: HistoryEntry[];
}
export type TransferStatus = "requested" | "dispatched" | "received" | "cancelled";
export interface Transfer {
  id: string; number: string; sku: string; product: string; quantity: number; fromBranch: string; toBranch: string;
  customer?: SaleCustomer; requestedBy: string; status: TransferStatus; createdAt: string; updatedAt: string;
  dispatchedAt?: string; receivedAt?: string; cancelReason?: string; history: HistoryEntry[];
}
export interface Pipeline { quotes: Quote[]; sourcing: SourcingRequest[]; transfers: Transfer[]; }

const KEY = "business_pipeline_v1";
export async function getPipeline(): Promise<Pipeline> {
  return { quotes: [], sourcing: [], transfers: [], ...await readFromStorage<Pipeline>(KEY) };
}
function change<T>(mutate: (state: Pipeline) => T): Promise<T> {
  return withSaleLock(async () => { const state = await getPipeline(); const result = mutate(state); await writeToStorage(KEY, state); return result; });
}
const money = (amount: number) => Math.round(amount * 100) / 100;
const note = (by: string, text: string): HistoryEntry => ({ at: new Date().toISOString(), by, change: text });
const nextNumber = (prefix: string, existing: { createdAt: string }[]) => {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return prefix + "-" + day + "-" + String(existing.filter((entry) => entry.createdAt.startsWith(new Date().toISOString().slice(0, 10))).length + 1).padStart(3, "0");
};
const isAdmin = (role?: string) => role === "admin";
const canProcure = (role?: string) => role === "admin" || role === "inventory_manager";

// ---- Quotes (SAL-05)
export const quoteSubtotal = (lines: QuoteLine[]) => money(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
export function quoteStatus(quote: Quote, now = Date.now()): QuoteStatus {
  return quote.status === "sent" && Date.parse(quote.validUntil) < now ? "expired" : quote.status;
}
function checkQuote(lines: QuoteLine[], discount: number, role?: string) {
  if (!lines.length || lines.some((line) => !line.name.trim() || !Number.isInteger(line.quantity) || line.quantity <= 0 ||
      !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) throw new Error("Each quote line needs a product, whole quantity and price.");
  const subtotal = quoteSubtotal(lines);
  if (!(discount >= 0) || discount > subtotal) throw new Error("Discount cannot be more than the subtotal.");
  if (!isAdmin(role) && discount > subtotal * QUOTE_DISCOUNT_LIMIT_PERCENT / 100) throw new Error("Discounts above " + QUOTE_DISCOUNT_LIMIT_PERCENT + "% need an admin account.");
}
export function createQuote(input: { customer: SaleCustomer; lines: QuoteLine[]; discount: number; validDays: number; owner: string;
  role?: string; note?: string; enquiryId?: string; sourcingId?: string }) {
  if (!input.customer.name.trim() || !input.customer.phone.trim() || !input.owner.trim() || !(input.validDays > 0)) {
    return Promise.reject(new Error("Select a customer and enter how many days the quote is valid."));
  }
  try { checkQuote(input.lines, input.discount, input.role); } catch (error) { return Promise.reject(error); }
  return change((state) => {
    const now = new Date().toISOString(); const discount = money(input.discount);
    const quote: Quote = { id: generateId(), number: nextNumber("QUO", state.quotes), customer: input.customer, lines: input.lines, discount,
      total: money(quoteSubtotal(input.lines) - discount), validUntil: new Date(Date.now() + input.validDays * 86400000).toISOString(),
      status: "draft", owner: input.owner, note: input.note?.trim() || undefined, enquiryId: input.enquiryId, sourcingId: input.sourcingId,
      createdAt: now, updatedAt: now, history: [note(input.owner, "Quote created")] };
    state.quotes.push(quote);
    const request = state.sourcing.find((entry) => entry.id === input.sourcingId);
    if (request) { request.status = "quote_created"; request.quoteId = quote.id; request.updatedAt = now; request.history.push(note(input.owner, "Customer quote " + quote.number + " created")); }
    return quote;
  });
}
export function sendQuote(id: string, by: string) {
  return change((state) => {
    const quote = state.quotes.find((entry) => entry.id === id);
    if (!quote || quote.status !== "draft") throw new Error("Only a draft quote can be sent.");
    quote.status = "sent"; quote.updatedAt = new Date().toISOString(); quote.history.push(note(by, "Sent to customer"));
  });
}
export function reviseQuote(id: string, by: string, role: string | undefined, lines: QuoteLine[], discount: number) {
  try { checkQuote(lines, discount, role); } catch (error) { return Promise.reject(error); }
  return change((state) => {
    const quote = state.quotes.find((entry) => entry.id === id);
    if (!quote || !["draft", "sent"].includes(quote.status)) throw new Error("This quote can no longer be revised.");
    const total = money(quoteSubtotal(lines) - money(discount));
    quote.history.push(note(by, "Revised: total " + quote.total.toFixed(2) + " to " + total.toFixed(2) + (quote.status === "sent" ? " (needs sending again)" : "")));
    Object.assign(quote, { lines, discount: money(discount), total, status: "draft", updatedAt: new Date().toISOString() });
  });
}
export function decideQuote(id: string, decision: "accepted" | "declined", by: string, reason: string) {
  return change((state) => {
    const quote = state.quotes.find((entry) => entry.id === id);
    if (!quote || quoteStatus(quote) !== "sent") throw new Error("Only a sent quote that has not expired can be accepted or declined.");
    if (decision === "declined" && !reason.trim()) throw new Error("Enter the reason the customer declined.");
    quote.status = decision; quote.updatedAt = new Date().toISOString();
    if (decision === "declined") quote.declineReason = reason.trim();
    quote.history.push(note(by, decision === "accepted" ? "Accepted by customer" : "Declined: " + reason.trim()));
  });
}
export async function convertQuoteToOrder(id: string, by: string, collectionDueAt: string) {
  const quote = (await getPipeline()).quotes.find((entry) => entry.id === id);
  if (!quote || quote.status !== "accepted" || quote.saleId) throw new Error("Only an accepted quote that has not been ordered can be converted.");
  const subtotal = quoteSubtotal(quote.lines);
  const sale = await createSale({ cashierName: by, channel: "in_store", customer: quote.customer, note: "From quote " + quote.number,
    lifecycle: "reserved", collectionDueAt, lines: quote.lines.map((line, index) => ({ productId: "quote-" + quote.id + "-" + index, name: line.name,
      quantity: line.quantity, unitPrice: line.unitPrice })), subtotal, total: quote.total,
    ...(quote.discount > 0 ? { discount: { amount: quote.discount, reason: "Quote " + quote.number, approvedBy: quote.owner } } : {}),
    payments: [], paymentMode: "cash" });
  await change((state) => {
    const saved = state.quotes.find((entry) => entry.id === id)!;
    saved.saleId = sale.id; saved.updatedAt = new Date().toISOString(); saved.history.push(note(by, "Converted to order " + sale.saleNumber));
  });
  return sale;
}

// ---- Request sourcing (SAL-04)
export function createSourcing(input: { customer: SaleCustomer; product: string; spec: string; quantity: number; requestedBy: string; enquiryId?: string }) {
  if (!input.customer.name.trim() || !input.customer.phone.trim() || !input.product.trim() || !Number.isInteger(input.quantity) || input.quantity <= 0) {
    return Promise.reject(new Error("Select a customer and enter the product and a whole quantity."));
  }
  return change((state) => {
    const now = new Date().toISOString();
    const request: SourcingRequest = { id: generateId(), number: nextNumber("SRC", state.sourcing), customer: input.customer, product: input.product.trim(),
      spec: input.spec.trim(), quantity: input.quantity, status: "requested", requestedBy: input.requestedBy, enquiryId: input.enquiryId,
      createdAt: now, updatedAt: now, history: [note(input.requestedBy, "Sourcing requested")] };
    state.sourcing.push(request); return request;
  });
}
export function respondSourcing(id: string, by: string, role: string | undefined, price: number, expectedAvailability: string, procurementNote: string) {
  if (!canProcure(role)) return Promise.reject(new Error("Only procurement (inventory manager or admin) can quote a sourcing request."));
  if (!(price > 0) || !Number.isFinite(Date.parse(expectedAvailability))) return Promise.reject(new Error("Enter the customer price and expected availability date."));
  return change((state) => {
    const request = state.sourcing.find((entry) => entry.id === id);
    if (!request || request.status !== "requested") throw new Error("This request has already been answered.");
    Object.assign(request, { status: "quoted", quotedPrice: money(price), expectedAvailability, procurementNote: procurementNote.trim() || undefined, updatedAt: new Date().toISOString() });
    request.history.push(note(by, "Quoted " + money(price).toFixed(2) + ", available " + expectedAvailability.slice(0, 10)));
  });
}
export function closeSourcing(id: string, by: string, reason: string) {
  if (!reason.trim()) return Promise.reject(new Error("Enter why this request is closed."));
  return change((state) => {
    const request = state.sourcing.find((entry) => entry.id === id);
    if (!request || request.status === "closed" || request.status === "quote_created") throw new Error("This request cannot be closed.");
    request.status = "closed"; request.closedReason = reason.trim(); request.updatedAt = new Date().toISOString(); request.history.push(note(by, "Closed: " + reason.trim()));
  });
}

// ---- Cross-branch fulfilment (SAL-03)
// Stock available at a branch after transfers already in flight or completed.
export function branchStock(transfers: Transfer[]) {
  return SAMPLE_BRANCH_STOCK.map((item) => {
    const stock = { ...item.stock };
    for (const transfer of transfers.filter((entry) => entry.sku === item.sku)) {
      if (transfer.status === "requested" || transfer.status === "dispatched") stock[transfer.fromBranch] -= transfer.quantity;
      if (transfer.status === "received") { stock[transfer.fromBranch] -= transfer.quantity; stock[transfer.toBranch] += transfer.quantity; }
    }
    return { ...item, stock };
  });
}
export function createTransfer(input: { sku: string; quantity: number; fromBranch: string; toBranch: string; customer?: SaleCustomer; requestedBy: string }) {
  return change((state) => {
    const item = branchStock(state.transfers).find((entry) => entry.sku === input.sku);
    if (!item || input.fromBranch === input.toBranch || !Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Choose a product, two different branches and a whole quantity.");
    if ((item.stock[input.fromBranch] ?? 0) < input.quantity) throw new Error(input.fromBranch + " does not have enough stock.");
    const now = new Date().toISOString();
    const transfer: Transfer = { id: generateId(), number: nextNumber("TRF", state.transfers), sku: item.sku, product: item.name, quantity: input.quantity,
      fromBranch: input.fromBranch, toBranch: input.toBranch, customer: input.customer, requestedBy: input.requestedBy, status: "requested",
      createdAt: now, updatedAt: now, history: [note(input.requestedBy, "Transfer requested")] };
    state.transfers.push(transfer); return transfer;
  });
}
export function advanceTransfer(id: string, action: "dispatch" | "receive" | "cancel", by: string, role: string | undefined, reason = "") {
  if (action === "dispatch" && !canProcure(role)) return Promise.reject(new Error("Only the sending branch's inventory team can dispatch stock."));
  if (action === "cancel" && !reason.trim()) return Promise.reject(new Error("Enter why this transfer is cancelled."));
  return change((state) => {
    const transfer = state.transfers.find((entry) => entry.id === id);
    const allowed = { dispatch: "requested", receive: "dispatched", cancel: "requested" }[action];
    if (!transfer || transfer.status !== allowed) throw new Error("This transfer is not in a state where that action is allowed.");
    const at = new Date().toISOString(); transfer.updatedAt = at;
    if (action === "dispatch") { transfer.status = "dispatched"; transfer.dispatchedAt = at; }
    else if (action === "receive") { transfer.status = "received"; transfer.receivedAt = at; }
    else { transfer.status = "cancelled"; transfer.cancelReason = reason.trim(); }
    transfer.history.push(note(by, action === "dispatch" ? "Dispatched" : action === "receive" ? "Received" : "Cancelled: " + reason.trim()));
  });
}
