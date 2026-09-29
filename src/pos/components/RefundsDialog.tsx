import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import { getRefunds, getSales, type Refund, type Sale } from "../lib/store";
import { printRefundReceipt } from "../lib/receipt";
import RefundPanel from "./RefundPanel";

const STATUS_LABEL: Record<Refund["status"], string> = { pending: "Awaiting repayment", paid: "Paid", cancelled: "Cancelled" };

export default function RefundsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [tab, setTab] = useState("history");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = () => Promise.all([getSales(), getRefunds()])
    .then(([saleList, refundList]) => { setSales(saleList); setRefunds(refundList); })
    .catch(() => toast.error("Could not load sales and refunds."));

  useEffect(() => { if (open) void load(); else { setSelectedId(null); setQuery(""); setTab("history"); } }, [open]);

  const selected = sales.find((sale) => sale.id === selectedId) ?? null;
  const history = useMemo(() => [...refunds].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [refunds]);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sales
      .filter((sale) => sale.lifecycle !== "cancelled")
      .filter((sale) => !term || sale.saleNumber.toLowerCase().includes(term) ||
        sale.customer?.name.toLowerCase().includes(term) || sale.customer?.phone.includes(term))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 25);
  }, [sales, query]);

  const openSale = (saleId: string) => { setSelectedId(saleId); setTab("new"); };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-3xl max-h-[90vh]" style={{ maxWidth: "48rem", maxHeight: "90vh", overflowY: "auto" }}>
      <DialogHeader>
        <DialogTitle>Refunds</DialogTitle>
        <DialogDescription>Review refund history or find a sale to return items or repay a deposit.</DialogDescription>
      </DialogHeader>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="history">Refund history</TabsTrigger><TabsTrigger value="new">New refund</TabsTrigger></TabsList>
        <TabsContent value="history" className="space-y-2">
          {!history.length && <p className="text-sm text-muted-foreground">No refunds recorded.</p>}
          {history.map((refund) => {
            const sale = sales.find((entry) => entry.id === refund.saleId);
            return <div key={refund.id} className="border border-border rounded-lg p-3 flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{refund.saleNumber} · {formatCurrency(refund.total)} <Badge variant="outline">{STATUS_LABEL[refund.status]}</Badge></p>
                <p>{refund.reason} · {refund.actor} · {refund.mode.replaceAll("_", " ")}</p>
                <p className="text-muted-foreground">{new Date(refund.createdAt).toLocaleString()} · {refund.kind === "deposit" ? "Deposit" : "Return"}</p>
              </div>
              <div className="flex gap-2 items-start">
                {sale && <Button size="sm" variant="outline" onClick={() => openSale(sale.id)}>Open sale</Button>}
                {sale && <Button size="sm" variant="outline" onClick={() => printRefundReceipt(refund, sale)}>Print</Button>}
              </div>
            </div>;
          })}
        </TabsContent>
        <TabsContent value="new" className="space-y-3">
          {selected ? <>
            <div className="flex justify-between items-center">
              <p className="font-medium">{selected.saleNumber} · {selected.customer?.name ?? "Walk-in"} · {formatCurrency(selected.total)}</p>
              <Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>Choose another sale</Button>
            </div>
            <RefundPanel sale={selected} onChanged={() => void load()} />
          </> : <>
            <Input aria-label="Find sale" placeholder="Search by sale number, customer name or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
            {!matches.length && <p className="text-sm text-muted-foreground">No matching sales.</p>}
            {matches.map((sale) => <button key={sale.id} type="button" onClick={() => setSelectedId(sale.id)}
              className="w-full text-left border border-border rounded-lg p-3 text-sm hover:bg-muted">
              <span className="font-medium">{sale.saleNumber}</span> · {formatCurrency(sale.total)} · {sale.customer?.name ?? "Walk-in"}
              <span className="block text-muted-foreground">{new Date(sale.createdAt).toLocaleString()} · {sale.lifecycle ?? "completed"}</span>
            </button>)}
          </>}
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>;
}
