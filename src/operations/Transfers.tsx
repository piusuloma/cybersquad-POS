import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuth, type User } from "@/frontdesk/lib/store";
import { getPipeline, createTransfer, advanceTransfer, branchStock, BRANCHES, type Transfer } from "./pipeline";

const hours = (from: string, to = new Date().toISOString()) => Math.round((Date.parse(to) - Date.parse(from)) / 3600000);

function TransferCard({ transfer, user, refresh }: { transfer: Transfer; user: User | null; refresh: () => void }) {
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const by = user?.name ?? "";
  const inventory = user?.role === "admin" || user?.role === "inventory_manager";
  const run = async (action: () => Promise<unknown>) => { setBusy(true); try { await action(); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update transfer."); } finally { setBusy(false); } };
  const open = transfer.status === "requested" || transfer.status === "dispatched";
  return <article className="border border-border rounded-lg p-4 space-y-2">
    <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{transfer.number} · {transfer.product} × {transfer.quantity}</p><span className="text-sm capitalize">{transfer.status}</span></div>
    <p className="text-sm">{transfer.fromBranch} to {transfer.toBranch} · requested by {transfer.requestedBy}{transfer.customer ? " for " + transfer.customer.name : ""} · {open ? hours(transfer.createdAt) + "h open" : transfer.receivedAt ? "turnaround " + hours(transfer.createdAt, transfer.receivedAt) + "h" : ""}</p>
    {transfer.cancelReason && <p className="text-sm">Cancelled: {transfer.cancelReason}</p>}
    <div className="flex flex-wrap gap-2">
      {transfer.status === "requested" && inventory && <Button size="sm" disabled={busy} onClick={() => void run(() => advanceTransfer(transfer.id, "dispatch", by, user?.role))}>Verify and dispatch</Button>}
      {transfer.status === "requested" && !inventory && <p className="text-sm text-muted-foreground">Waiting for {transfer.fromBranch} inventory to dispatch.</p>}
      {transfer.status === "dispatched" && <Button size="sm" disabled={busy} onClick={() => void run(() => advanceTransfer(transfer.id, "receive", by, user?.role))}>Mark received at {transfer.toBranch}</Button>}
    </div>
    {transfer.status === "requested" && <div className="flex flex-wrap gap-2"><Input aria-label="Cancel reason" className="flex-1 min-w-48" placeholder="Reason to cancel" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => advanceTransfer(transfer.id, "cancel", by, user?.role, reason))}>Cancel transfer</Button></div>}
    <ul className="text-xs text-muted-foreground space-y-1 border-l-2 border-border pl-3">{transfer.history.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString()} · {entry.by}: {entry.change}</li>)}</ul>
  </article>;
}

export default function Transfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]); const [user, setUser] = useState<User | null>(null);
  const [sku, setSku] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [quantity, setQuantity] = useState("1"); const [busy, setBusy] = useState(false);
  const load = () => getPipeline().then((state) => setTransfers(state.transfers)).catch(() => toast.error("Could not load transfers."));
  useEffect(() => { void load(); getAuth().then((auth) => { setUser(auth); const home = BRANCHES.find((branch) => auth?.storeLocation?.toLowerCase().includes(branch.toLowerCase())); if (home) setTo(home); }); }, []);
  const stock = branchStock(transfers); const selling = user?.role === "sales" || user?.role === "admin";
  return <div className="space-y-4">
    <p className="text-xs text-muted-foreground">Branch stock is sample data. It changes only when a transfer is dispatched or received, so sales staff cannot edit quantities.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm border border-border rounded"><thead><tr className="text-left"><th className="p-2">Product</th>{BRANCHES.map((branch) => <th key={branch} className="p-2">{branch}</th>)}</tr></thead>
      <tbody>{stock.map((item) => <tr key={item.sku} className="border-t border-border"><td className="p-2">{item.name}</td>{BRANCHES.map((branch) => <td key={branch} className={"p-2 " + (item.stock[branch] <= 0 ? "text-destructive" : "")}>{item.stock[branch]}</td>)}</tr>)}</tbody></table></div>
    {selling && <form className="glass-card p-4 space-y-3" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true);
      try { await createTransfer({ sku, quantity: Number(quantity), fromBranch: from, toBranch: to, requestedBy: user?.name ?? "" }); setQuantity("1"); await load(); toast.success("Transfer requested."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not request transfer."); } finally { setBusy(false); }
    }}>
      <p className="font-medium">Request stock from another branch</p>
      <div className="grid sm:grid-cols-4 gap-3">
        <label className="text-sm sm:col-span-2">Product<select required aria-label="Transfer product" className="block w-full border rounded p-2 bg-background" value={sku} onChange={(event) => setSku(event.target.value)}><option value="">Choose</option>{stock.map((item) => <option key={item.sku} value={item.sku}>{item.name}</option>)}</select></label>
        <label className="text-sm">From<select required aria-label="Sending branch" className="block w-full border rounded p-2 bg-background" value={from} onChange={(event) => setFrom(event.target.value)}><option value="">Choose</option>{BRANCHES.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
        <label className="text-sm">To<select required aria-label="Receiving branch" className="block w-full border rounded p-2 bg-background" value={to} onChange={(event) => setTo(event.target.value)}><option value="">Choose</option>{BRANCHES.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
      </div>
      <label className="block text-sm w-32">Quantity<Input required type="number" min={1} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <Button disabled={busy} type="submit">Request transfer</Button>
    </form>}
    {[...transfers].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((transfer) => <TransferCard key={transfer.id + transfer.updatedAt} transfer={transfer} user={user} refresh={load} />)}
    {!transfers.length && <p className="text-muted-foreground">No transfers yet.</p>}
  </div>;
}
