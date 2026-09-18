// Local stub persistence for POS sales. No backend sales/Odoo POS endpoints
// exist yet, so sales are recorded locally (same IndexedDB/localStorage
// approach the repairs module uses for Invoice — see src/frontdesk/lib/store.ts)
// until real backend-synced endpoints are available. Because this is
// per-browser storage, sales are only visible on the device they were made on.
import { dbGet, dbSet } from "@/frontdesk/lib/db";
import { generateId } from "@/frontdesk/lib/store";
import type { PosCartLine } from "./cart";

export type SaleChannel = "in_store" | "website";
export type SalePaymentMode = "cash" | "pos" | "bank_transfer";

export interface Sale {
  id: string;
  saleNumber: string;
  cashierName: string;
  channel: SaleChannel;
  lines: PosCartLine[];
  subtotal: number;
  total: number;
  paymentMode: SalePaymentMode;
  cashTendered?: number;
  changeDue?: number;
  createdAt: string;
}

export interface HeldSale {
  id: string;
  label: string;
  lines: PosCartLine[];
  subtotal: number;
  heldAt: string;
}

export interface CashShift {
  id: string;
  cashierName: string;
  openingFloat: number;
  openedAt: string;
  closingFloat?: number;
  closedAt?: string;
  cashSalesTotal?: number;
  expectedCash?: number;
  variance?: number;
}

const SALES_KEY = "pos_sales";
const HELD_SALES_KEY = "pos_held_sales";
const SHIFTS_KEY = "pos_shifts";

async function readFromStorage<T>(key: string): Promise<T | null> {
  try {
    const value = await dbGet<T>(key);
    if (value != null) return value;
  } catch {
    // Fall back to localStorage if IndexedDB is unavailable.
  }

  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeToStorage<T>(key: string, value: T): Promise<void> {
  try {
    await dbSet(key, value);
  } catch {
    // Continue with localStorage fallback if IndexedDB is unavailable.
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore localStorage write failures in restricted environments.
    }
  }
}

function generateSaleNumber(existingSales: Sale[]): string {
  const dayStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sequence =
    existingSales.filter((sale) => sale.saleNumber.startsWith(`SALE-${dayStamp}-`)).length + 1;
  return `SALE-${dayStamp}-${String(sequence).padStart(3, "0")}`;
}

export async function getSales(): Promise<Sale[]> {
  const raw = await readFromStorage<Sale[]>(SALES_KEY);
  return Array.isArray(raw) ? raw : [];
}

export async function createSale(
  input: Omit<Sale, "id" | "saleNumber" | "createdAt">
): Promise<Sale> {
  const sales = await getSales();
  const sale: Sale = {
    ...input,
    id: generateId(),
    saleNumber: generateSaleNumber(sales),
    createdAt: new Date().toISOString(),
  };

  sales.push(sale);
  await writeToStorage(SALES_KEY, sales);
  return sale;
}

// ===== Held sales (park a cart, resume it later) =====

export async function getHeldSales(): Promise<HeldSale[]> {
  const raw = await readFromStorage<HeldSale[]>(HELD_SALES_KEY);
  return Array.isArray(raw) ? raw : [];
}

export async function holdSale(input: {
  label: string;
  lines: PosCartLine[];
  subtotal: number;
}): Promise<HeldSale> {
  const held = await getHeldSales();
  const sale: HeldSale = {
    ...input,
    id: generateId(),
    heldAt: new Date().toISOString(),
  };
  held.push(sale);
  await writeToStorage(HELD_SALES_KEY, held);
  return sale;
}

export async function resumeHeldSale(id: string): Promise<HeldSale | null> {
  const held = await getHeldSales();
  const sale = held.find((s) => s.id === id) ?? null;
  if (sale) {
    await writeToStorage(
      HELD_SALES_KEY,
      held.filter((s) => s.id !== id)
    );
  }
  return sale;
}

export async function discardHeldSale(id: string): Promise<void> {
  const held = await getHeldSales();
  await writeToStorage(
    HELD_SALES_KEY,
    held.filter((s) => s.id !== id)
  );
}

// ===== Cash shifts (opening/closing float reconciliation) =====

export async function getShifts(): Promise<CashShift[]> {
  const raw = await readFromStorage<CashShift[]>(SHIFTS_KEY);
  return Array.isArray(raw) ? raw : [];
}

// A register is single-till per device: only one open (unclosed) shift at a time.
export async function getActiveShift(): Promise<CashShift | null> {
  const shifts = await getShifts();
  return shifts.find((shift) => !shift.closedAt) ?? null;
}

export async function startShift(cashierName: string, openingFloat: number): Promise<CashShift> {
  const shifts = await getShifts();
  const shift: CashShift = {
    id: generateId(),
    cashierName,
    openingFloat,
    openedAt: new Date().toISOString(),
  };
  shifts.push(shift);
  await writeToStorage(SHIFTS_KEY, shifts);
  return shift;
}

export async function endShift(shiftId: string, closingFloat: number): Promise<CashShift> {
  const shifts = await getShifts();
  const index = shifts.findIndex((shift) => shift.id === shiftId);
  if (index === -1) throw new Error("Shift not found.");

  const shift = shifts[index];
  const sales = await getSales();
  const closedAt = new Date().toISOString();
  const cashSalesTotal = sales
    .filter(
      (sale) =>
        sale.paymentMode === "cash" &&
        sale.createdAt >= shift.openedAt &&
        sale.createdAt <= closedAt
    )
    .reduce((sum, sale) => sum + sale.total, 0);
  const expectedCash = shift.openingFloat + cashSalesTotal;

  const updatedShift: CashShift = {
    ...shift,
    closingFloat,
    closedAt,
    cashSalesTotal,
    expectedCash,
    variance: closingFloat - expectedCash,
  };

  shifts[index] = updatedShift;
  await writeToStorage(SHIFTS_KEY, shifts);
  return updatedShift;
}

// "today" is a calendar-day cutoff (matches POS/cashier framing); the rest
// mirror the range values already used by /jobs/admin/dashboard/stats/?range=
// so repair and sales revenue can be combined for the same period.
export type SalesSummaryRange = "today" | "1d" | "3d" | "7d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<Exclude<SalesSummaryRange, "today" | "all">, number> = {
  "1d": 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function isWithinRange(createdAt: string, range: SalesSummaryRange) {
  if (range === "all") return true;

  const created = new Date(createdAt).getTime();
  if (range === "today") {
    return created >= new Date().setHours(0, 0, 0, 0);
  }

  const days = RANGE_DAYS[range];
  return created >= Date.now() - days * 24 * 60 * 60 * 1000;
}

// Read-only summary for the admin dashboard (src/components/DashboardOverview.jsx).
// getSales() itself (below) backs the full-record src/components/SalesRecords.jsx
// page. These are the only exports the admin side should import from this
// module — the cart/checkout write path stays POS-only.
export async function getSalesSummary(range: SalesSummaryRange = "today") {
  const sales = await getSales();
  const inRange = sales.filter((sale) => isWithinRange(sale.createdAt, range));

  const totalSalesCount = inRange.length;
  const totalRevenue = inRange.reduce((sum, sale) => sum + sale.total, 0);

  const itemTotals = new Map<string, { name: string; qty: number; revenue: number }>();
  inRange.forEach((sale) => {
    sale.lines.forEach((line) => {
      const existing = itemTotals.get(line.productId);
      const revenue = line.unitPrice * line.quantity;
      if (existing) {
        existing.qty += line.quantity;
        existing.revenue += revenue;
      } else {
        itemTotals.set(line.productId, { name: line.name, qty: line.quantity, revenue });
      }
    });
  });

  const topSellingItems = [...itemTotals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  // "website" channel has no data source yet — always 0 until an online
  // storefront exists; surfaced explicitly rather than fabricated.
  const channelBreakdown = {
    in_store: inRange.filter((sale) => sale.channel === "in_store").length,
    website: inRange.filter((sale) => sale.channel === "website").length,
  };

  return { totalSalesCount, totalRevenue, topSellingItems, channelBreakdown };
}
