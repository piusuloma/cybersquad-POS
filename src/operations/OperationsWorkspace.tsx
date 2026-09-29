import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getAuth, type Ticket } from "@/frontdesk/lib/store";
import { getSales, orderBalance, type Sale } from "@/pos/lib/store";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import { SaleRecordDetailModal } from "@/components/SaleRecordDetailModal";
import CustomerDirectory from "./CustomerDirectory";
import Enquiries from "./Enquiries";
import WarrantyLookup from "./WarrantyLookup";
import OperationsOverview from "./OperationsOverview";
function Orders() {
  const [orders, setOrders] = useState<Sale[]>([]); const [selected, setSelected] = useState<Sale | null>(null);
  const load = () => getSales().then((sales) => setOrders(sales.filter((sale) => sale.lifecycle === "reserved")));
  useEffect(() => { void load(); }, []);
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Reserve an in-stock cart from New Sale. Settle its balance and verify the customer before collection.</p>
    {orders.map((sale) => <div key={sale.id} className="border border-border rounded p-4 flex flex-wrap justify-between gap-2">
      <div><p className="font-medium">{sale.isDemo ? "Sample ? " : ""}{sale.saleNumber} · {sale.customer?.name}</p><p className="text-sm">Balance: {formatCurrency(orderBalance(sale))} ? Expected {new Date(sale.collectionDueAt!).toLocaleString()}</p></div>
      <Button variant="outline" onClick={() => setSelected(sale)}>Payment / collection</Button>
    </div>)}{!orders.length && <p>No orders awaiting collection.</p>}
    <SaleRecordDetailModal sale={selected} open={Boolean(selected)} onOpenChange={(open: boolean) => { if (!open) { setSelected(null); void load(); } }} />
  </div>;
}
export interface ExtraTab { value: string; label: string; content: ReactNode; }
export default function OperationsWorkspace({ admin = false, onOpenRepair, initialTab, extraTabs = [], hideOverview = false }: {
  admin?: boolean; onOpenRepair?: (ticket: Ticket) => void; initialTab?: string; extraTabs?: ExtraTab[]; hideOverview?: boolean;
}) {
  const navigate = useNavigate(); const [role, setRole] = useState(admin ? "admin" : ""); const [tab, setTab] = useState(initialTab ?? "overview");
  useEffect(() => { if (!admin) getAuth().then((user) => { setRole(user?.role ?? ""); }); }, [admin]);
  const openRepair = onOpenRepair ?? ((ticket: Ticket) => navigate("/ticket/" + encodeURIComponent(ticket.id)));
  const salesAccess = role === "sales" || role === "admin";
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">Business operations</h1><p className="text-sm text-muted-foreground">Customers, after-sales support and work needing attention.</p></div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap h-auto justify-start gap-1">{!hideOverview && <TabsTrigger value="overview">{role === "admin" ? "Overview" : "My work"}</TabsTrigger>}
        <TabsTrigger value="customers">{admin ? "Sales contacts" : "Customers"}</TabsTrigger>
        {salesAccess && <><TabsTrigger value="enquiries">Follow-ups</TabsTrigger><TabsTrigger value="orders">Orders & collection</TabsTrigger></>}
        <TabsTrigger value="warranty">Warranty lookup</TabsTrigger>{extraTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}</TabsList>
      {!hideOverview && <TabsContent value="overview"><OperationsOverview role={role} onOpenRepair={openRepair} onEnquiries={() => setTab(salesAccess ? "enquiries" : "customers")} /></TabsContent>}
      <TabsContent value="customers"><CustomerDirectory onOpenRepair={openRepair} /></TabsContent>
      {salesAccess && <><TabsContent value="enquiries"><Enquiries /></TabsContent><TabsContent value="orders"><Orders /></TabsContent></>}
      <TabsContent value="warranty"><WarrantyLookup onSelect={role === "front_desk" ? (record) => navigate("/new-ticket?intakeType=warranty&warrantyId=" + encodeURIComponent(record.id)) : undefined} /></TabsContent>
      {extraTabs.map((tab) => <TabsContent key={tab.value} value={tab.value}>{tab.content}</TabsContent>)}
    </Tabs>
  </div>;
}
