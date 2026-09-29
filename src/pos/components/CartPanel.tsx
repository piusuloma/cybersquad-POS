import { useEffect, useState } from "react";
import DeviceDetails from "./DeviceDetails";
import { Minus, Plus, ShoppingCart, Trash2, Banknote, PauseCircle, SplitSquareHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import { PAYMENT_MODE_LABELS } from "@/frontdesk/lib/store";
import type { PosCartLine } from "@/pos/lib/cart";
import type { SalePayment, SalePaymentMode } from "@/pos/lib/store";

const PAYMENT_MODES: SalePaymentMode[] = ["cash", "pos", "bank_transfer"];

interface PaymentRow {
  id: string;
  mode: SalePaymentMode;
  amount: string;
}

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

interface CartPanelProps {
  lines: PosCartLine[];
  subtotal: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClear: () => void;
  onHold: () => void;
  onCharge: (payments: SalePayment[]) => void;
  charging: boolean;
  shiftActive: boolean;
  onSelectDevices: (productId: string) => void;
  deviceCheckoutReady: boolean;
}

export default function CartPanel({
  lines,
  subtotal,
  onUpdateQuantity,
  onRemoveItem,
  onClear,
  onHold,
  onCharge,
  charging,
  shiftActive,
  onSelectDevices,
  deviceCheckoutReady,
}: CartPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  // Single-payment path (the common case): one method covers the whole sale.
  const [paymentMode, setPaymentMode] = useState<SalePaymentMode>("cash");
  const [cashTendered, setCashTendered] = useState("");

  // Split-payment path: two or more methods each cover part of the sale.
  const [splitRows, setSplitRows] = useState<PaymentRow[] | null>(null);

  // Start each new sale with a clean payment state.
  useEffect(() => {
    if (lines.length === 0) {
      setPaymentMode("cash");
      setCashTendered("");
      setSplitRows(null);
    }
  }, [lines.length]);

  const isSplit = splitRows !== null;

  const startSplit = () => {
    setSplitRows([
      { id: nextRowId(), mode: paymentMode, amount: "" },
      { id: nextRowId(), mode: "pos", amount: "" },
    ]);
  };

  const cancelSplit = () => {
    setSplitRows(null);
  };

  const addSplitRow = () => {
    setSplitRows((rows) => [...(rows ?? []), { id: nextRowId(), mode: "cash", amount: "" }]);
  };

  const removeSplitRow = (id: string) => {
    setSplitRows((rows) => {
      const next = (rows ?? []).filter((row) => row.id !== id);
      return next.length >= 2 ? next : null;
    });
  };

  const updateSplitRow = (id: string, patch: Partial<PaymentRow>) => {
    setSplitRows((rows) => (rows ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const tenderedAmount = Number(cashTendered) || 0;
  const changeDue = tenderedAmount - subtotal;
  const cashInsufficient = !isSplit && paymentMode === "cash" && (!cashTendered || tenderedAmount < subtotal);

  const splitAllocated = isSplit
    ? (splitRows ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    : 0;
  const splitRemaining = subtotal - splitAllocated;
  const splitInvalid =
    isSplit && (Math.abs(splitRemaining) > 0.01 || (splitRows ?? []).some((row) => !(Number(row.amount) > 0)));

  const canCharge = lines.length > 0 && !charging && !cashInsufficient && !splitInvalid && shiftActive && deviceCheckoutReady;
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const handleCharge = () => {
    if (!canCharge) return;
    if (isSplit) {
      onCharge((splitRows ?? []).map((row) => ({ mode: row.mode, amount: Number(row.amount) || 0 })));
    } else {
      onCharge([
        {
          mode: paymentMode,
          amount: subtotal,
          ...(paymentMode === "cash" ? { cashTendered: tenderedAmount, changeDue } : {}),
        },
      ]);
    }
  };

  return (
    <div className="glass-card p-4 flex flex-col h-fit lg:sticky lg:top-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Current Sale</h3>
          {itemCount > 0 && (
            <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-1.5">
              {itemCount}
            </span>
          )}
        </div>
        {lines.length > 0 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onHold}>
              <PauseCircle className="w-3.5 h-3.5 mr-1" />
              Hold
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Cart is empty</p>
          <p className="text-xs text-muted-foreground">Scan a barcode or select a product to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto pr-1" aria-live="polite">
          {lines.map((line) => (
            <div key={line.productId} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{line.name}</p>
                <DeviceDetails line={line} />
                {line.tracking === "serial" && <Button size="sm" variant="outline" onClick={() => onSelectDevices(line.productId)}>Change devices</Button>}
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(line.unitPrice)} × {line.quantity} ={" "}
                  {formatCurrency(line.unitPrice * line.quantity)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Decrease quantity of ${line.name}`}
                  disabled={line.tracking === "serial"}
                  onClick={() => onUpdateQuantity(line.productId, line.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  disabled={line.tracking === "serial"}
                  min={1}
                  value={line.quantity}
                  aria-label={`Quantity of ${line.name}`}
                  onChange={(e) => {
                    const value = Math.max(1, Math.floor(Number(e.target.value) || 1));
                    onUpdateQuantity(line.productId, value);
                  }}
                  className="w-14 h-7 text-center px-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Increase quantity of ${line.name}`}
                  disabled={line.tracking === "serial"}
                  onClick={() => onUpdateQuantity(line.productId, line.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  aria-label={`Remove ${line.name} from cart`}
                  onClick={() => onRemoveItem(line.productId)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4 space-y-3 mt-auto">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold text-lg text-foreground">{formatCurrency(subtotal)}</span>
        </div>

        {!isSplit ? (
          <>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as SalePaymentMode)}>
              <SelectTrigger aria-label="Payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {paymentMode === "cash" && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground" htmlFor="cash-tendered">
                  <Banknote className="w-3.5 h-3.5" />
                  Cash Tendered
                </label>
                <Input
                  id="cash-tendered"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  placeholder="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Change Due</span>
                  <span className={`font-medium ${changeDue < 0 ? "text-destructive" : "text-success"}`}>
                    {formatCurrency(Math.max(0, changeDue))}
                  </span>
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={startSplit}>
                <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1.5" />
                Split Payment
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                Split Payment
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground" onClick={cancelSplit}>
                Cancel
              </Button>
            </div>

            {(splitRows ?? []).map((row) => (
              <div key={row.id} className="flex items-center gap-1.5">
                <Select value={row.mode} onValueChange={(v) => updateSplitRow(row.id, { mode: v as SalePaymentMode })}>
                  <SelectTrigger aria-label="Payment method" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {PAYMENT_MODE_LABELS[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  placeholder="Amount"
                  aria-label={`Amount for ${PAYMENT_MODE_LABELS[row.mode]}`}
                  value={row.amount}
                  onChange={(e) => updateSplitRow(row.id, { amount: e.target.value })}
                  className="h-9"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove payment method"
                  onClick={() => removeSplitRow(row.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" className="w-full" onClick={addSplitRow}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Payment Method
            </Button>

            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-muted-foreground">Remaining</span>
              <span className={`font-medium ${splitRemaining !== 0 ? "text-destructive" : "text-success"}`}>
                {formatCurrency(splitRemaining)}
              </span>
            </div>
          </div>
        )}

        {!shiftActive && (
          <p className="text-xs text-destructive text-center">Start a shift to accept payment.</p>
        )}
        <Button className="w-full h-11 text-base" disabled={!canCharge} onClick={handleCharge}>
          {charging ? "Processing..." : `Charge ${formatCurrency(subtotal)}`}
        </Button>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all {itemCount} item(s) from the cart. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
            >
              Clear Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
