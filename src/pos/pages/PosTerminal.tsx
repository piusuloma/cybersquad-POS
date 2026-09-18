import { useEffect, useState } from "react";
import { toast } from "sonner";
import { History, PauseCircle, Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { fetchPosCatalog } from "@/pos/lib/catalog";
import { usePosCart } from "@/pos/lib/cart";
import {
  createSale,
  getActiveShift,
  holdSale,
  resumeHeldSale,
  startShift,
  type CashShift,
  type Sale,
  type SalePaymentMode,
} from "@/pos/lib/store";
import { getAuth, getSettings, AppSettings, InventoryItem, User } from "@/frontdesk/lib/store";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import ProductGrid from "@/pos/components/ProductGrid";
import CartPanel from "@/pos/components/CartPanel";
import SaleCompleteDialog from "@/pos/components/SaleCompleteDialog";
import StartShiftDialog from "@/pos/components/StartShiftDialog";
import EndShiftDialog from "@/pos/components/EndShiftDialog";
import ShiftHistoryDialog from "@/pos/components/ShiftHistoryDialog";
import HeldSalesDialog from "@/pos/components/HeldSalesDialog";
import HoldSaleDialog from "@/pos/components/HoldSaleDialog";
import { SalesDetailModal } from "@/components/SalesDetailModal";

export default function PosTerminal() {
  const { api } = useApi();
  const cart = usePosCart();

  const [catalog, setCatalog] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [paymentMode, setPaymentMode] = useState<SalePaymentMode>("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const [shift, setShift] = useState<CashShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showEndShift, setShowEndShift] = useState(false);
  const [showShiftHistory, setShowShiftHistory] = useState(false);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showHoldPrompt, setShowHoldPrompt] = useState(false);
  const [showSaleHistory, setShowSaleHistory] = useState(false);
  const [heldRefreshKey, setHeldRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [items, authUser, appSettings, activeShift] = await Promise.all([
          fetchPosCatalog(api),
          getAuth(),
          getSettings(),
          getActiveShift(),
        ]);
        if (!mounted) return;
        setCatalog(items);
        setUser(authUser);
        setSettings(appSettings);
        setShift(activeShift);
      } catch (err) {
        console.error("Failed to load POS terminal:", err);
        toast.error("Could not load the product catalog.");
      } finally {
        if (mounted) {
          setLoading(false);
          setShiftLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddItem = (item: InventoryItem, quantity = 1) => {
    cart.addItem(item, quantity);
  };

  const handleStartShift = async (openingFloat: number) => {
    const newShift = await startShift(user?.name || "Cashier", openingFloat);
    setShift(newShift);
    toast.success("Shift started.");
  };

  const handleHold = (label: string) => {
    void holdSale({ label, lines: cart.lines, subtotal: cart.subtotal }).then(() => {
      cart.clear();
      setShowHoldPrompt(false);
      setHeldRefreshKey((k) => k + 1);
      toast.success("Sale held.");
    });
  };

  const handleResume = (heldSaleId: string) => {
    if (cart.lines.length > 0) {
      toast.error("Hold or clear the current sale before resuming another.");
      return;
    }
    void resumeHeldSale(heldSaleId).then((sale) => {
      if (sale) {
        cart.restore(sale.lines);
        setShowHeldSales(false);
      }
    });
  };

  const handleCharge = async () => {
    if (cart.lines.length === 0 || !shift) return;

    const tenderedAmount = Number(cashTendered) || 0;
    if (paymentMode === "cash" && tenderedAmount < cart.subtotal) return;

    setCharging(true);
    try {
      const sale = await createSale({
        cashierName: user?.name || "Cashier",
        channel: "in_store",
        lines: cart.lines,
        subtotal: cart.subtotal,
        total: cart.subtotal,
        paymentMode,
        ...(paymentMode === "cash"
          ? { cashTendered: tenderedAmount, changeDue: tenderedAmount - cart.subtotal }
          : {}),
      });

      setCompletedSale(sale);
      cart.clear();
      setCashTendered("");
    } catch (err) {
      console.error("Failed to complete sale:", err);
      toast.error("Could not complete the sale.");
    } finally {
      setCharging(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4 text-primary" />
          {shiftLoading ? (
            <span className="text-muted-foreground">Checking shift status...</span>
          ) : shift ? (
            <span className="text-foreground">
              Shift open · Float {formatCurrency(shift.openingFloat)} · since{" "}
              {new Date(shift.openedAt).toLocaleTimeString()}
            </span>
          ) : (
            <span className="text-muted-foreground">No active shift</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHeldSales(true)}>
            <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
            Held Sales
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSaleHistory(true)}>
            <History className="w-3.5 h-3.5 mr-1.5" />
            Sale History
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShiftHistory(true)}>
            <History className="w-3.5 h-3.5 mr-1.5" />
            Shift History
          </Button>
          {shift && (
            <Button variant="outline" size="sm" onClick={() => setShowEndShift(true)}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              End Shift
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductGrid items={catalog} loading={loading} onAddItem={handleAddItem} />
        </div>

        <CartPanel
          lines={cart.lines}
          subtotal={cart.subtotal}
          onUpdateQuantity={cart.updateQuantity}
          onRemoveItem={cart.removeItem}
          onClear={cart.clear}
          onHold={() => setShowHoldPrompt(true)}
          paymentMode={paymentMode}
          onPaymentModeChange={(mode) => {
            setPaymentMode(mode);
            if (mode !== "cash") setCashTendered("");
          }}
          cashTendered={cashTendered}
          onCashTenderedChange={setCashTendered}
          onCharge={handleCharge}
          charging={charging}
        />
      </div>

      <StartShiftDialog open={!shiftLoading && !shift} onStart={handleStartShift} />
      <EndShiftDialog
        open={showEndShift}
        shift={shift}
        onOpenChange={setShowEndShift}
        onEnded={() => setShift(null)}
      />
      <ShiftHistoryDialog open={showShiftHistory} onOpenChange={setShowShiftHistory} />
      <HeldSalesDialog
        open={showHeldSales}
        onOpenChange={setShowHeldSales}
        onResume={handleResume}
        refreshKey={heldRefreshKey}
      />
      <HoldSaleDialog open={showHoldPrompt} onOpenChange={setShowHoldPrompt} onHold={handleHold} />
      <SalesDetailModal open={showSaleHistory} onOpenChange={setShowSaleHistory} />
      <SaleCompleteDialog sale={completedSale} settings={settings} onNewSale={() => setCompletedSale(null)} />
    </div>
  );
}
