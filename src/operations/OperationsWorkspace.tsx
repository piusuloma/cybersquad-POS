import { useEffect, useState } from "react";
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
import Sourcing from "./Sourcing";
import Transfers from "./Transfers";
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
export default function OperationsWorkspace({ admin = false, onOpenRepair }: { admin?: boolean; onOpenRepair?: (ticket: Ticket) => void }) {
  const navigate = useNavigate(); const [role, setRole] = useState(admin ? "admin" : ""); const [tab, setTab] = useState("overview");
  useEffect(() => { if (!admin) getAuth().then((user) => { setRole(user?.role ?? ""); if (user?.role === "inventory_manager") setTab("sourcing"); }); }, [admin]);
  const openRepair = onOpenRepair ?? ((ticket: Ticket) => navigate("/ticket/" + encodeURIComponent(ticket.id)));
  const salesAccess = role === "sales" || role === "admin";
  const procureAccess = salesAccess || role === "inventory_manager";
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">Business operations</h1><p className="text-sm text-muted-foreground">Customers, after-sales support and work needing attention.</p></div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap h-auto justify-start gap-1"><TabsTrigger value="overview">{role === "admin" ? "Overview" : "My work"}</TabsTrigger>
        {role !== "inventory_manager" && <TabsTrigger value="customers">Customers</TabsTrigger>}
        {salesAccess && <><TabsTrigger value="enquiries">Follow-ups</TabsTrigger><TabsTrigger value="orders">Orders & collection</TabsTrigger></>}
        {procureAccess && <><TabsTrigger value="sourcing">Sourcing</TabsTrigger><TabsTrigger value="transfers">Branch transfers</TabsTrigger></>}
        {role !== "inventory_manager" && <TabsTrigger value="warranty">Warranty lookup</TabsTrigger>}</TabsList>
      <TabsContent value="overview"><OperationsOverview role={role} onOpenRepair={openRepair} onEnquiries={() => setTab(salesAccess ? "enquiries" : "customers")} onTab={setTab} /></TabsContent>
      {role !== "inventory_manager" && <TabsContent value="customers"><CustomerDirectory onOpenRepair={openRepair} /></TabsContent>}
      {salesAccess && <><TabsContent value="enquiries"><Enquiries /></TabsContent><TabsContent value="orders"><Orders /></TabsContent></>}
      {procureAccess && <><TabsContent value="sourcing"><Sourcing /></TabsContent><TabsContent value="transfers"><Transfers /></TabsContent></>}
      {role !== "inventory_manager" && <TabsContent value="warranty"><WarrantyLookup onSelect={role === "front_desk" ? (record) => navigate("/new-ticket?intakeType=warranty&warrantyId=" + encodeURIComponent(record.id)) : undefined} /></TabsContent>}
    </Tabs>
  </div>;
}
