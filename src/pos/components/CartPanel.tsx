import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, Banknote, PauseCircle } from "lucide-react";
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
import type { SalePaymentMode } from "@/pos/lib/store";

const PAYMENT_MODES: SalePaymentMode[] = ["cash", "pos", "bank_transfer"];

interface CartPanelProps {
  lines: PosCartLine[];
  subtotal: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClear: () => void;
  onHold: () => void;
  paymentMode: SalePaymentMode;
  onPaymentModeChange: (mode: SalePaymentMode) => void;
  cashTendered: string;
  onCashTenderedChange: (value: string) => void;
  onCharge: () => void;
  charging: boolean;
}

export default function CartPanel({
  lines,
  subtotal,
  onUpdateQuantity,
  onRemoveItem,
  onClear,
  onHold,
  paymentMode,
  onPaymentModeChange,
  cashTendered,
  onCashTenderedChange,
  onCharge,
  charging,
}: CartPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const tenderedAmount = Number(cashTendered) || 0;
  const changeDue = tenderedAmount - subtotal;
  const cashInsufficient = paymentMode === "cash" && (!cashTendered || tenderedAmount < subtotal);
  const canCharge = lines.length > 0 && !charging && !cashInsufficient;
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

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
                  onClick={() => onUpdateQuantity(line.productId, line.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
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

        <Select value={paymentMode} onValueChange={(v) => onPaymentModeChange(v as SalePaymentMode)}>
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
              onChange={(e) => onCashTenderedChange(e.target.value)}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Change Due</span>
              <span className={`font-medium ${changeDue < 0 ? "text-destructive" : "text-success"}`}>
                {formatCurrency(Math.max(0, changeDue))}
              </span>
            </div>
          </div>
        )}

        <Button className="w-full h-11 text-base" disabled={!canCharge} onClick={onCharge}>
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
