import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import CustomerPicker from "@/operations/CustomerPicker";
import ReserveOrderDialog from "../components/ReserveOrderDialog";
import { Label } from "@/components/ui/label";
import DeviceSelectionDialog from "../components/DeviceSelectionDialog";
import { SAMPLE_CATALOG } from "../lib/sampleCatalog";
import { validateDeviceLines, type PosProduct, type SaleCustomer } from "../lib/devices";
import { toast } from "sonner";
import { History, PauseCircle, Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { fetchPosCatalog } from "@/pos/lib/catalog";
import { usePosCart } from "@/pos/lib/cart";
import {
  createSale,
  getSales,
  getHeldSales,
  getActiveShift,
  holdSale,
  resumeHeldSale,
  startShift,
  type CashShift,
  type Sale,
  type SalePayment,
  type SalePaymentMode,
} from "@/pos/lib/store";
import { getAuth, getSettings, AppSettings, User } from "@/frontdesk/lib/store";
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

  const [catalog, setCatalog] = useState<PosProduct[]>([]);
  const [sampleMode, setSampleMode] = useState(false);
  const [note, setNote] = useState("");
  const [showReserve, setShowReserve] = useState(false);
  const [customer, setCustomer] = useState<SaleCustomer>({ name: "", phone: "" });
  const [deviceProduct, setDeviceProduct] = useState<PosProduct | null>(null);
  const [unavailableUnits, setUnavailableUnits] = useState<Set<string>>(new Set());
  const activeCatalog = sampleMode ? SAMPLE_CATALOG : catalog;
  const needsCustomer = cart.lines.some((line) => line.tracking === "serial");
  const deviceCheckoutReady = !needsCustomer || Boolean(customer.name.trim() && customer.phone.trim());
  const clearSale = () => { cart.clear(); setNote(""); setCustomer({ name: "", phone: "" }); };
  const selectDevices = async (item: PosProduct) => {
    try {
      const [sales, held] = await Promise.all([getSales(), getHeldSales()]);
      setUnavailableUnits(new Set([...sales.filter((sale) => sale.lifecycle !== "cancelled"), ...held].flatMap((record) =>
        record.lines.flatMap((line) => (line.devices ?? []).map((unit) => unit.id)))));
      setDeviceProduct(item);
    } catch {
      toast.error("Could not check device availability. Try again.");
    }
  };
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const [shift, setShift] = useState<CashShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showStartShift, setShowStartShift] = useState(false);
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
          fetchPosCatalog(api).catch((error) => {
            console.error("Could not load catalog", error);
            toast.error("Could not load the product catalog. Sample devices are still available.");
            return [];
          }),
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

  const handleAddItem = (item: PosProduct, quantity = 1) => {
    if (item.tracking === "serial") { void selectDevices(item); return; }
    const existing = cart.lines.find((line) => line.productId === item.id)?.quantity ?? 0;
    if (existing + quantity > item.quantity - item.locked) { toast.error("Requested quantity is not available."); return; }
    cart.addItem(item, quantity);
  };

  const handleStartShift = async (openingFloat: number) => {
    const newShift = await startShift(user?.name || "Cashier", openingFloat);
    setShift(newShift);
    setShowStartShift(false);
    toast.success("Shift started.");
  };

  const handleHold = (label: string) => {
    void holdSale({ label, lines: cart.lines, subtotal: cart.subtotal, customer, note }).then(() => {
      clearSale();
      setShowHoldPrompt(false);
      setHeldRefreshKey((k) => k + 1);
      toast.success("Sale held.");
    }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not hold sale."));
  };

  const handleResume = (heldSaleId: string) => {
    if (cart.lines.length > 0) {
      toast.error("Hold or clear the current sale before resuming another.");
      return;
    }
    void resumeHeldSale(heldSaleId).then((sale) => {
      if (sale) {
        cart.restore(sale.lines);
        setCustomer(sale.customer ?? { name: "", phone: "" });
        setNote(sale.note ?? "");
        setSampleMode(sale.lines.some((line) => line.isDemo));
        setShowHeldSales(false);
      }
    }).catch(() => toast.error("Could not resume held sale."));
  };

  const handleCharge = async (payments: SalePayment[]) => {
    if (cart.lines.length === 0 || payments.length === 0) return;
    if (!shift) {
      toast.error("Start a shift before taking payment.");
      return;
    }

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (Math.round(totalPaid) !== Math.round(cart.subtotal)) return;

    setCharging(true);
    try {
      validateDeviceLines(cart.lines);
      const primary = payments[0];
      const sale = await createSale({
        cashierName: user?.name || "Cashier",
        customer: customer.name.trim() ? { ...customer, name: customer.name.trim(), phone: customer.phone.trim() } : undefined,
        note,
        channel: "in_store",
        lines: cart.lines,
        subtotal: cart.subtotal,
        total: cart.subtotal,
        payments,
        paymentMode: primary.mode,
        ...(payments.length === 1 && primary.mode === "cash"
          ? { cashTendered: primary.cashTendered, changeDue: primary.changeDue }
          : {}),
      });

      setCompletedSale(sale);
      clearSale();
    } catch (err) {
      console.error("Failed to complete sale:", err);
      toast.error(err instanceof Error ? err.message : "Could not complete the sale.");
    } finally {
      setCharging(false);
    }
  };

  const reserveOrder = async (amount: number, mode: SalePaymentMode, dueAt: string) => {
    setCharging(true);
    try {
      if (!shift && amount > 0) throw new Error("Start a shift before receiving a deposit.");
      await createSale({ cashierName: user?.name || "Cashier", channel: "in_store",
        customer, note, lifecycle: "reserved", collectionDueAt: dueAt, lines: cart.lines,
        subtotal: cart.subtotal, total: cart.subtotal, payments: amount > 0 ? [{ mode, amount }] : [], paymentMode: mode });
      setShowReserve(false); clearSale(); toast.success("Order reserved. Open Sale History to record payment or collection.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not reserve order."); }
    finally { setCharging(false); }
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
          {shift ? (
            <Button variant="outline" size="sm" onClick={() => setShowEndShift(true)}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              End Shift
            </Button>
          ) : (
            !shiftLoading && (
              <Button size="sm" onClick={() => setShowStartShift(true)}>
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Start Shift
              </Button>
            )
          )}
        </div>
      </div>

      <div className="glass-card p-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{sampleMode ? "Sample catalog - fictional devices and warranty terms. Sample sales are excluded from revenue and cash totals." : "Product catalog"}</p>
        <Button variant="outline" size="sm" disabled={cart.lines.length > 0} onClick={() => setSampleMode(!sampleMode)}>
          {sampleMode ? "Back to product catalog" : "Try sample devices"}
        </Button>
      </div>
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-medium">Customer {needsCustomer ? "- Required for device purchases" : "- Optional"}</p>
        <CustomerPicker value={customer} onChange={setCustomer} />
        <Label htmlFor="sale-note">Customer note (optional)</Label><Input id="sale-note" value={note} onChange={(event) => setNote(event.target.value)} />
        {!deviceCheckoutReady && <p className="text-sm text-muted-foreground">Add a name and phone to link the device and warranty to this customer.</p>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductGrid items={activeCatalog} loading={!sampleMode && loading} onAddItem={handleAddItem} />
        </div>

        <CartPanel
          lines={cart.lines}
          subtotal={cart.subtotal}
          onUpdateQuantity={(id, quantity) => {
            const product = activeCatalog.find((item) => item.id === id);
            if (!product || quantity > product.quantity - product.locked) { toast.error("Requested quantity is not available."); return; }
            cart.updateQuantity(id, quantity);
          }}
          onRemoveItem={cart.removeItem}
          onClear={clearSale}
          deviceCheckoutReady={deviceCheckoutReady}
          onSelectDevices={(productId) => {
            const item = activeCatalog.find((product) => product.id === productId);
            if (item) void selectDevices(item);
            else toast.error("Product is no longer in the catalog.");
          }}
          onHold={() => setShowHoldPrompt(true)}
          onCharge={handleCharge}
          charging={charging}
          shiftActive={!!shift}
        />
      </div>

      {cart.lines.length > 0 && <Button variant="outline" disabled={charging || !customer.name.trim() || !customer.phone.trim()} onClick={() => setShowReserve(true)}>Reserve for collection</Button>}
      {showReserve && <ReserveOrderDialog total={cart.subtotal} busy={charging} onClose={() => setShowReserve(false)} onSave={reserveOrder} />}
      {deviceProduct && <DeviceSelectionDialog key={deviceProduct.id} product={deviceProduct}
        selected={cart.lines.find((line) => line.productId === deviceProduct.id)?.devices ?? []}
        unavailable={unavailableUnits} onClose={() => setDeviceProduct(null)}
        onConfirm={(devices) => { cart.setDevices(deviceProduct, devices); setDeviceProduct(null); }} />}
      <StartShiftDialog open={showStartShift} onOpenChange={setShowStartShift} onStart={handleStartShift} />
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
