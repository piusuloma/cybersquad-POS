import { readFromStorage, writeToStorage, withSaleLock } from "@/pos/lib/store";
import { generateId } from "@/frontdesk/lib/store";
import type { SaleCustomer } from "@/pos/lib/devices";

// Prototype data for sourcing requests and branch transfers. Stored locally like the rest of the
// operations module; stock per branch is fixed sample data, adjusted only by transfers recorded here.
export const BRANCHES = ["Ikeja", "Lekki", "Abuja"];
export const SAMPLE_BRANCH_STOCK: { sku: string; name: string; stock: Record<string, number> }[] = [
  { sku: "SAMPLE-IP13", name: "Sample iPhone 13 - 128GB", stock: { Ikeja: 0, Lekki: 4, Abuja: 2 } },
  { sku: "SAMPLE-LAPTOP", name: "Sample laptop - 16GB / 512GB", stock: { Ikeja: 1, Lekki: 0, Abuja: 0 } },
  { sku: "SAMPLE-CABLE", name: "Sample USB-C cable", stock: { Ikeja: 20, Lekki: 8, Abuja: 0 } },
];

export interface HistoryEntry { at: string; by: string; change: string; }
export type SourcingStatus = "requested" | "quoted" | "closed";
export interface SourcingRequest {
  id: string; number: string; customer: SaleCustomer; product: string; spec: string; quantity: number;
  status: SourcingStatus; requestedBy: string; enquiryId?: string; quotedPrice?: number; expectedAvailability?: string;
  procurementNote?: string; closedReason?: string; createdAt: string; updatedAt: string; history: HistoryEntry[];
}
export type TransferStatus = "requested" | "dispatched" | "received" | "cancelled";
export interface Transfer {
  id: string; number: string; sku: string; product: string; quantity: number; fromBranch: string; toBranch: string;
  customer?: SaleCustomer; requestedBy: string; status: TransferStatus; createdAt: string; updatedAt: string;
  dispatchedAt?: string; receivedAt?: string; cancelReason?: string; history: HistoryEntry[];
}
export interface Pipeline { sourcing: SourcingRequest[]; transfers: Transfer[]; }

const KEY = "business_pipeline_v1";
export async function getPipeline(): Promise<Pipeline> {
  return { sourcing: [], transfers: [], ...await readFromStorage<Pipeline>(KEY) };
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
const canProcure = (role?: string) => role === "admin" || role === "inventory_manager";

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
    if (!request || request.status === "closed") throw new Error("This request cannot be closed.");
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
