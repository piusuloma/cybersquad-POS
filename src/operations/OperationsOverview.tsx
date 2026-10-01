import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuth, getTickets, mapBackendTicketToFrontend, type Ticket } from "@/frontdesk/lib/store";
import { useApi } from "@/hooks/useApi";
import { getSales, getRefunds, orderBalance, type Sale, type Refund } from "@/pos/lib/store";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import { SaleRecordDetailModal } from "@/components/SaleRecordDetailModal";
import { getBusiness, periodBounds, repairStage, saveBlocker, type BlockerContext } from "./business";

type Blocker = { id: string; title: string; state: string; owner: string; action: string; since: string; open: () => void; };
function BlockerRow({ item, context, refresh }: { item: Blocker; context?: BlockerContext; refresh: () => void }) {
  const [owner, setOwner] = useState(context?.owner ?? item.owner);
  const [action, setAction] = useState(context?.nextAction ?? item.action);
  const [due, setDue] = useState(context?.dueAt ?? ""); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false);
  const age = Math.max(0, Math.floor((Date.now() - Date.parse(item.since)) / 86400000));
  return <div className="rounded-lg border border-border p-3 space-y-2">
    <div className="flex flex-wrap justify-between gap-2"><Button variant="link" className="p-0" onClick={item.open}>{item.title}</Button><span className={age > 3 ? "text-sm font-medium text-destructive" : "text-sm"}>{item.state} · {age} days{age > 3 ? " · Aged" : ""}</span></div>
    <p className="text-sm">Owner: {context?.owner ?? item.owner} ? Next: {context?.nextAction ?? item.action}</p>
    {context?.dueAt && <p className="text-xs">Action due {new Date(context.dueAt).toLocaleDateString()}{Date.parse(context.dueAt) < Date.now() ? " ? Overdue" : ""}</p>}
    <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>Assign / update action</Button>
    {editing && <form className="space-y-2" onSubmit={async (event) => { event.preventDefault(); setBusy(true);
      try { await saveBlocker(item.id, owner, action, due); setEditing(false); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save action."); } finally { setBusy(false); }
    }}><Input aria-label="Blocker owner" required value={owner} onChange={(event) => setOwner(event.target.value)} />
      <Input aria-label="Next action" required value={action} onChange={(event) => setAction(event.target.value)} />
      <Input aria-label="Action due date" type="date" value={due} onChange={(event) => setDue(event.target.value)} /><Button disabled={busy} type="submit" size="sm">Save action</Button></form>}
  </div>;
}
export default function OperationsOverview({ onOpenRepair, onEnquiries, roles, attentionOnly = false }: {
  onOpenRepair: (ticket: Ticket) => void; onEnquiries: () => void; roles: string[]; attentionOnly?: boolean;
}) {
  const { api } = useApi();
  const [sales, setSales] = useState<Sale[]>([]); const [refunds, setRefunds] = useState<Refund[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]); const [state, setState] = useState<Awaited<ReturnType<typeof getBusiness>>>();
  const [period, setPeriod] = useState("today"); const [selected, setSelected] = useState<Sale | null>(null);
  const [filter, setFilter] = useState("all"); const [loadedAt, setLoadedAt] = useState(""); const [repairSource, setRepairSource] = useState("Saved repair records");
  const [loading, setLoading] = useState(false); const [userName, setUserName] = useState("");
  const management = roles.includes("admin"); const isFrontDesk = roles.includes("front_desk");
  useEffect(() => { getAuth().then((user) => setUserName(user?.name ?? "")); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [orders, returns, repairs, context] = await Promise.all([getSales(), getRefunds(), getTickets(), getBusiness()]);
      setSales(orders); setRefunds(returns); setTickets(repairs); setState(context);
      if (management || isFrontDesk) {
        try {
          const response = await api.get("/jobs/admin/bookings/", { params: { page_size: 1000 } });
          if (response.data?.success && Array.isArray(response.data.result)) {
            const remote = response.data.result.map(mapBackendTicketToFrontend);
            const merged = new Map(repairs.filter((ticket) => !/^\d+$/.test(ticket.id)).map((ticket) => [ticket.id, ticket]));
            remote.forEach((ticket: Ticket) => merged.set(ticket.id, ticket)); setTickets([...merged.values()]);
            setRepairSource(Number(response.data.pagination?.count ?? remote.length) > remote.length ? "Repair snapshot (first 1,000 records; full history awaits reporting API)" : "Current backend repair snapshot");
          }
        } catch { setRepairSource("Saved repair records ? backend unavailable"); }
      }
      setLoadedAt(new Date().toLocaleTimeString());
    } catch { toast.error("Could not load operational records."); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [management, isFrontDesk]);
  const [from, to] = periodBounds(period);
  const inPeriod = (date: string) => Date.parse(date) >= from && Date.parse(date) <= to;
  const completed = sales.filter((sale) => !sale.isDemo && (!sale.lifecycle || sale.lifecycle === "completed") && inPeriod(sale.createdAt));
  const paidRefunds = refunds.filter((refund) => !refund.isDemo && refund.status === "paid" && inPeriod(refund.paidAt ?? refund.createdAt));
  const gross = completed.reduce((sum, sale) => sum + sale.total, 0);
  const returned = paidRefunds.filter((refund) => refund.kind !== "deposit").reduce((sum, refund) => sum + refund.total, 0);
  const orders = sales.filter((sale) => !sale.isDemo && sale.lifecycle === "reserved");
  const active = tickets.filter((ticket) => !["completed", "closed", "delivered", "cancelled"].includes(ticket.status));
  const enquiries = state?.enquiries ?? [];
  const enquiryCohort = enquiries.filter((enquiry) => inPeriod(enquiry.createdAt));
  const conversion = enquiryCohort.length ? Math.round(enquiryCohort.filter((entry) => entry.status === "converted").length / enquiryCohort.length * 100) : 0;
  const blockers: Blocker[] = [
    ...orders.map((sale) => ({ id: "order:" + sale.id, title: sale.saleNumber + " · " + (sale.customer?.name ?? "Customer"), state: orderBalance(sale) > 0 ? "Order balance due" : "Paid, uncollected", owner: sale.cashierName,
      action: orderBalance(sale) > 0 ? "Confirm payment and arrange collection" : "Contact customer for collection", since: sale.orderCreatedAt ?? sale.createdAt, open: () => setSelected(sale) })),
    ...active.map((ticket) => ({ id: "repair:" + ticket.id, title: ticket.jobId + " · " + ticket.customer.name, state: repairStage(ticket),
      owner: ticket.assignedEngineer || (repairStage(ticket) === "QC pending" ? "QA desk" : "Front desk"), action: "Review " + repairStage(ticket).toLowerCase(),
      since: ticket.updatedAt || ticket.createdAt, open: () => onOpenRepair(ticket) })),
    ...enquiries.filter((enquiry) => enquiry.status === "open").map((enquiry) => ({ id: "enquiry:" + enquiry.id, title: enquiry.customer.name + " · " + enquiry.request,
      state: Date.parse(enquiry.followUpAt) < Date.now() ? "Overdue follow-up" : "Follow-up", owner: enquiry.owner, action: "Contact customer",
      since: enquiry.createdAt, open: onEnquiries })),
    ...refunds.filter((refund) => !refund.isDemo && refund.status === "pending").map((refund) => ({ id: "refund:" + refund.id, title: "Refund ? " + refund.saleNumber, state: refund.approval?.status === "required" ? "Refund awaiting approval" : "Repayment pending",
      owner: refund.approval?.status === "required" ? "Admin" : refund.actor, action: refund.approval?.status === "required" ? "Approve or reject refund" : "Complete repayment and record reference", since: refund.createdAt, open: () => setSelected(sales.find((sale) => sale.id === refund.saleId) ?? null) })),
  ];
  const ownerOf = (item: Blocker) => state?.blockers[item.id]?.owner ?? item.owner;
  const visible = management ? blockers : blockers.filter((item) => ownerOf(item) === userName || (isFrontDesk && ownerOf(item) === "Front desk"));
  const groups = [...new Set(visible.map((item) => item.state))];
  const performance = new Map<string, { count: number; amount: number }>();
  completed.forEach((sale) => { const row = performance.get(sale.cashierName) ?? { count: 0, amount: 0 }; row.count++; row.amount += sale.total; performance.set(sale.cashierName, row); });
  const products = new Map<string, { name: string; quantity: number; amount: number }>();
  completed.forEach((sale) => sale.lines.forEach((line) => { const row = products.get(line.productId) ?? { name: line.name, quantity: 0, amount: 0 }; row.quantity += line.quantity; row.amount += line.quantity * line.unitPrice; products.set(line.productId, row); }));
  return <div className="space-y-4">
    {management ? <>
    <div className="flex flex-wrap justify-between gap-3"><select aria-label="Reporting period" className="border rounded p-2 bg-background" value={period} onChange={(event) => setPeriod(event.target.value)}>
      {[["today", "Today"], ["week", "This week"], ["previous_week", "Previous week"], ["30", "30 days"], ["60", "60 days"], ["90", "90 days"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select><Button variant="outline" disabled={loading} onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</Button></div>
    <p className="text-xs text-muted-foreground">Sales and follow-ups: records on this device. {repairSource}. Updated {loadedAt || "?"}. Gross margin requires product cost data.</p>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        ["Gross sales", formatCurrency(gross)], ["Paid returns", formatCurrency(returned)], ["Net sales", formatCurrency(gross - returned)],
        ["Sales / average value", completed.length + " / " + formatCurrency(completed.length ? gross / completed.length : 0)],
        ["Open repairs", String(active.length)], ["Paid, uncollected", String(orders.filter((sale) => orderBalance(sale) === 0).length)],
        ["Order balances", formatCurrency(orders.reduce((sum, sale) => sum + orderBalance(sale), 0))],
        ["Enquiry conversion", conversion + "% (" + enquiryCohort.length + " enquiries opened in period)"],
        ["New repair jobs", String(tickets.filter((ticket) => inPeriod(ticket.createdAt)).length)],
        ["Completed repairs", String(tickets.filter((ticket) => ["completed", "closed", "delivered"].includes(ticket.status) && inPeriod(ticket.handedOverAt ?? ticket.updatedAt)).length)],
        ["Warranty / repeat intake", String(tickets.filter((ticket) => (ticket.isWarranty || ticket.isRepeatCase) && inPeriod(ticket.createdAt)).length)],
      ].filter(([label]) => !attentionOnly || ["Paid returns", "Net sales", "Paid, uncollected", "Order balances", "Enquiry conversion", "Warranty / repeat intake"].includes(label)).map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold mt-1">{value}</p></div>)}
    </div>
    {!attentionOnly && <>
    <div className="grid md:grid-cols-2 gap-4"><div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm space-y-2"><h3 className="font-medium">Salesperson performance</h3>{[...performance].map(([name, row]) => <p key={name} className="text-sm">{name}: {row.count} sales ? {formatCurrency(row.amount)}</p>)}{!performance.size && <p className="text-sm text-muted-foreground">No completed sales in this period.</p>}</div>
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm space-y-2"><h3 className="font-medium">Products sold</h3>{[...products.values()].sort((a, b) => b.amount - a.amount).slice(0, 8).map((row) => <p key={row.name} className="text-sm">{row.name}: {row.quantity} · {formatCurrency(row.amount)}</p>)}</div></div>
    </>}
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm space-y-2"><h3 className="font-medium">Repairs waiting on parts</h3>
        {(() => { const parts = active.filter((ticket) => repairStage(ticket) === "Awaiting parts");
          return parts.length ? parts.map((ticket) => <p key={ticket.id} className="text-sm">{ticket.jobId} · waiting {Math.floor((Date.now() - Date.parse(ticket.updatedAt || ticket.createdAt)) / 86400000)} days</p>) : <p className="text-sm text-muted-foreground">No repairs are waiting on parts.</p>; })()}</div>
      <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm space-y-2"><h3 className="font-medium">Branch comparison</h3>
        {(() => { const rows = new Map<string, { sales: number; revenue: number }>();
          completed.forEach((sale) => { const key = sale.branch ?? "Unassigned"; const entry = rows.get(key) ?? { sales: 0, revenue: 0 }; entry.sales++; entry.revenue += sale.total; rows.set(key, entry); });
          return rows.size ? [...rows].map(([branch, entry]) => <p key={branch} className="text-sm">{branch}: {entry.sales} sales · {formatCurrency(entry.revenue)}</p>) : <p className="text-sm text-muted-foreground">No branch activity in this period.</p>; })()}
        <p className="text-xs text-muted-foreground">Repair volume by branch needs a branch on each repair job.</p></div>
    </div>
    </> : <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">My work</h2><p className="text-sm text-muted-foreground">Follow-ups, orders and actions assigned to you.</p></div><Button variant="outline" disabled={loading} onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh"}</Button></div>}
    {(() => { const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const due = enquiries.filter((enquiry) => enquiry.status === "open" && (management || enquiry.owner === userName) && Date.parse(enquiry.followUpAt) <= endOfDay.getTime())
        .sort((a, b) => Date.parse(a.followUpAt) - Date.parse(b.followUpAt));
      return <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm space-y-2"><div className="flex justify-between"><h3 className="font-semibold">Follow-ups due today or overdue ({due.length})</h3>
        <Button size="sm" variant="outline" onClick={onEnquiries}>Open follow-ups</Button></div>
        {!due.length && <p className="text-sm text-muted-foreground">Nothing due today.</p>}
        {due.slice(0, 8).map((enquiry) => <p key={enquiry.id} className="text-sm">{Date.parse(enquiry.followUpAt) < Date.now() ? "Overdue · " : "Today · "}{enquiry.customer.name} · {enquiry.request} · {enquiry.owner} · {new Date(enquiry.followUpAt).toLocaleString()}</p>)}
      </div>; })()}
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm space-y-3"><h3 className="font-semibold">Open work and next actions</h3><p className="text-xs text-muted-foreground">Includes all open work, regardless of reporting period. Repair age is time since its latest recorded update; action due dates are explicit commitments, not inferred SLA deadlines.</p>
      <select aria-label="Filter blockers" className="border rounded p-2 bg-background" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All open work ({visible.length})</option>{groups.map((group) => <option key={group}>{group}</option>)}</select>
      {visible.filter((item) => filter === "all" || item.state === filter).sort((a, b) => Date.parse(a.since) - Date.parse(b.since)).map((item) => <BlockerRow key={item.id} item={item} context={state?.blockers[item.id]} refresh={load} />)}
      {!visible.length && <p>No open work in the available records.</p>}
    </div>
    <SaleRecordDetailModal sale={selected} open={Boolean(selected)} onOpenChange={(open: boolean) => { if (!open) { setSelected(null); void load(); } }} />
  </div>;
}
