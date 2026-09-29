import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuth, type User } from "@/frontdesk/lib/store";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import type { SaleCustomer } from "@/pos/lib/devices";
import CustomerPicker from "./CustomerPicker";
import { getPipeline, createSourcing, respondSourcing, closeSourcing, SAMPLE_BRANCH_STOCK, type SourcingRequest } from "./pipeline";

const LABEL: Record<SourcingRequest["status"], string> = { requested: "Awaiting procurement", quoted: "Price returned to sales", closed: "Closed" };

function RequestCard({ request, user, refresh }: { request: SourcingRequest; user: User | null; refresh: () => void }) {
  const [price, setPrice] = useState(""); const [available, setAvailable] = useState(""); const [procNote, setProcNote] = useState("");
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  const by = user?.name ?? ""; const procurement = user?.role === "admin" || user?.role === "inventory_manager"; const selling = user?.role === "sales" || user?.role === "admin";
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); try { await action(); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update request."); } finally { setBusy(false); }
  };
  const ageDays = Math.floor((Date.now() - Date.parse(request.createdAt)) / 86400000);
  return <article className="border border-border rounded-lg p-4 space-y-2">
    <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{request.number} · {request.product} × {request.quantity}</p><span className="text-sm">{LABEL[request.status]}</span></div>
    <p className="text-sm">{request.customer.name} · {request.customer.phone} · requested by {request.requestedBy} · {ageDays} day(s) old</p>
    {request.spec && <p className="text-sm">Specification: {request.spec}</p>}
    {request.quotedPrice && <p className="text-sm">Customer price {formatCurrency(request.quotedPrice)} · expected availability {request.expectedAvailability?.slice(0, 10)}{request.procurementNote ? " · " + request.procurementNote : ""}</p>}
    {request.closedReason && <p className="text-sm">Closed: {request.closedReason}</p>}
    {request.status === "requested" && procurement && <div className="flex flex-wrap gap-2">
      <Input aria-label="Customer price" className="w-36" type="number" min={0} step="0.01" placeholder="Customer price" value={price} onChange={(event) => setPrice(event.target.value)} />
      <Input aria-label="Expected availability" className="w-44" type="date" value={available} onChange={(event) => setAvailable(event.target.value)} />
      <Input aria-label="Procurement note" className="flex-1 min-w-40" placeholder="Supplier / note (optional)" value={procNote} onChange={(event) => setProcNote(event.target.value)} />
      <Button size="sm" disabled={busy} onClick={() => void run(() => respondSourcing(request.id, by, user?.role, Number(price), available, procNote))}>Send quote back</Button></div>}
    {request.status === "requested" && !procurement && <p className="text-sm text-muted-foreground">Waiting for procurement to return a price and availability.</p>}
    {(request.status === "requested" || request.status === "quoted") && <div className="flex flex-wrap gap-2">
      <Input aria-label="Close reason" className="flex-1 min-w-48" placeholder="Reason to close (declined, unavailable...)" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => closeSourcing(request.id, by, reason))}>Close request</Button></div>}
    <ul className="text-xs text-muted-foreground space-y-1 border-l-2 border-border pl-3">{request.history.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString()} · {entry.by}: {entry.change}</li>)}</ul>
  </article>;
}

export default function Sourcing({ seedCustomer }: { seedCustomer?: SaleCustomer }) {
  const [requests, setRequests] = useState<SourcingRequest[]>([]); const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<SaleCustomer | undefined>(seedCustomer); const [product, setProduct] = useState("");
  const [spec, setSpec] = useState(""); const [quantity, setQuantity] = useState("1"); const [busy, setBusy] = useState(false); const [filter, setFilter] = useState("open");
  const load = () => getPipeline().then((state) => setRequests(state.sourcing)).catch(() => toast.error("Could not load sourcing requests."));
  useEffect(() => { void load(); getAuth().then(setUser); }, []);
  const selling = user?.role === "sales" || user?.role === "admin";
  const inStock = product.trim() ? SAMPLE_BRANCH_STOCK.filter((item) => item.name.toLowerCase().includes(product.trim().toLowerCase()) && Object.values(item.stock).some((count) => count > 0)) : [];
  return <div className="space-y-4">
    {selling && <form className="glass-card p-4 space-y-3" onSubmit={async (event) => {
      event.preventDefault(); if (!customer?.name) { toast.error("Select a customer first."); return; } setBusy(true);
      try { await createSourcing({ customer, product, spec, quantity: Number(quantity), requestedBy: user?.name ?? "" }); setProduct(""); setSpec(""); setQuantity("1"); await load(); toast.success("Sourcing request sent to procurement."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not send request."); } finally { setBusy(false); }
    }}>
      <p className="font-medium">Request sourcing for an item unavailable at every branch</p><CustomerPicker value={customer} onChange={setCustomer} />
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm sm:col-span-2">Product<Input required value={product} onChange={(event) => setProduct(event.target.value)} /></label>
        <label className="text-sm">Quantity<Input required type="number" min={1} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      </div>
      {inStock.length > 0 && <p className="text-sm text-amber-600">Already in stock at another branch: {inStock.map((item) => item.name).join(", ")}. Use a branch transfer instead.</p>}
      <label className="block text-sm">Specification<Input value={spec} onChange={(event) => setSpec(event.target.value)} /></label>
      <Button disabled={busy} type="submit">Request sourcing</Button>
    </form>}
    <label className="text-sm">Show<select className="ml-2 border rounded p-2 bg-background" value={filter} onChange={(event) => setFilter(event.target.value)}>
      <option value="open">Open</option><option value="closed">Closed</option><option value="all">All</option></select></label>
    {requests.filter((request) => filter === "all" || (filter === "closed" ? request.status === "closed" : request.status !== "closed")).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .map((request) => <RequestCard key={request.id + request.updatedAt} request={request} user={user} refresh={load} />)}
    {!requests.length && <p className="text-muted-foreground">No sourcing requests.</p>}
  </div>;
}
