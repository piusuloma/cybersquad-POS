import { userHasRole, type AppRole } from "@/auth/roleUtils";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuth, type Ticket } from "@/frontdesk/lib/store";
import { getSales, orderBalance, type Sale } from "@/pos/lib/store";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import { SaleRecordDetailModal } from "@/components/SaleRecordDetailModal";
import Enquiries from "./Enquiries";
import WarrantyLookup from "./WarrantyLookup";
import OperationsOverview from "./OperationsOverview";
function Orders() {
  const [orders, setOrders] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null);
  const load = () => getSales().then((sales) => setOrders(sales.filter((sale) => sale.lifecycle === "reserved")));

  useEffect(() => { void load(); }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders Awaiting Collection</CardTitle>
        <CardDescription>
          Reserved in-store orders that still need payment, customer verification, or collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.map((sale) => (
          <div key={sale.id} className="rounded-lg border border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium">{sale.isDemo ? "Sample - " : ""}{sale.saleNumber} - {sale.customer?.name}</p>
              <p className="text-sm text-muted-foreground">
                Balance: {formatCurrency(orderBalance(sale))} - Expected {new Date(sale.collectionDueAt!).toLocaleString()}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelected(sale)}>Payment / collection</Button>
          </div>
        ))}
        {!orders.length && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No orders awaiting collection.
          </div>
        )}
        <SaleRecordDetailModal sale={selected} open={Boolean(selected)} onOpenChange={(open: boolean) => { if (!open) { setSelected(null); void load(); } }} />
      </CardContent>
    </Card>
  );
}
export interface ExtraTab { value: string; label: string; content: ReactNode; }
export default function OperationsWorkspace({ admin = false, onOpenRepair, initialTab, extraTabs = [], hideOverview = false, hideHeader = false }: {
  admin?: boolean; onOpenRepair?: (ticket: Ticket) => void; initialTab?: string; extraTabs?: ExtraTab[]; hideOverview?: boolean; hideHeader?: boolean;
}) {
  const navigate = useNavigate(); const [roles, setRoles] = useState<AppRole[]>(admin ? ["admin"] : []); const [tab, setTab] = useState(initialTab ?? (hideOverview ? "records" : "overview"));
  useEffect(() => { if (!admin) getAuth().then((user) => { setRoles(user?.roles?.length ? user.roles : user?.role ? [user.role] : []); }); }, [admin]);
  const openRepair = onOpenRepair ?? ((ticket: Ticket) => navigate("/ticket/" + encodeURIComponent(ticket.id)));
  const isAdmin = roles.includes("admin");
  const followUpAccess = userHasRole({ roles }, "front_desk", "sales", "admin");
  const orderAccess = userHasRole({ roles }, "sales", "admin");
  const fallbackTab = hideOverview ? (extraTabs[0]?.value ?? (followUpAccess ? "enquiries" : orderAccess ? "orders" : "warranty")) : "overview";
  const availableTabs = useMemo(() => new Set([
    ...extraTabs.map((entry) => entry.value),
    ...(!hideOverview ? ["overview"] : []),
    ...(followUpAccess ? ["enquiries"] : []),
    ...(orderAccess ? ["orders"] : []),
    "warranty",
  ]), [extraTabs, followUpAccess, hideOverview, orderAccess]);
  useEffect(() => { if (!availableTabs.has(tab)) setTab(fallbackTab); }, [tab, fallbackTab, availableTabs]);
  useEffect(() => { if (initialTab && availableTabs.has(initialTab)) setTab(initialTab); }, [initialTab, availableTabs]);
  return <div className="space-y-6 animate-fade-in">
    {!hideHeader && (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Business operations</CardTitle>
          <CardDescription>Follow-ups, orders, warranty lookup and work needing attention.</CardDescription>
        </CardHeader>
      </Card>
    )}
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <Card>
        <CardContent className="p-2">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            {!hideOverview && <TabsTrigger value="overview">{isAdmin ? "Overview" : "My work"}</TabsTrigger>}
            {extraTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
            {followUpAccess && <TabsTrigger value="enquiries">Follow-ups</TabsTrigger>}
            {orderAccess && <TabsTrigger value="orders">Orders & collection</TabsTrigger>}
            <TabsTrigger value="warranty">Warranty lookup</TabsTrigger>
          </TabsList>
        </CardContent>
      </Card>
      {!hideOverview && <TabsContent value="overview" className="mt-0"><OperationsOverview roles={roles} onOpenRepair={openRepair} onEnquiries={() => setTab(followUpAccess ? "enquiries" : "overview")} /></TabsContent>}
      {followUpAccess && <TabsContent value="enquiries" className="mt-0"><Enquiries /></TabsContent>}
      {orderAccess && <TabsContent value="orders" className="mt-0"><Orders /></TabsContent>}
      <TabsContent value="warranty" className="mt-0"><WarrantyLookup onSelect={roles.includes("front_desk") ? (record) => navigate("/new-ticket?intakeType=warranty&warrantyId=" + encodeURIComponent(record.id)) : undefined} /></TabsContent>
      {extraTabs.map((tab) => <TabsContent key={tab.value} value={tab.value} className="mt-0">{tab.content}</TabsContent>)}
    </Tabs>
  </div>;
}
