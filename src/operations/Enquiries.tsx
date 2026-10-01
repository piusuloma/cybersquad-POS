import { useEffect, useState } from "react";
import { AlarmClock, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuth } from "@/frontdesk/lib/store";
import { getSales, type Sale } from "@/pos/lib/store";
import type { SaleCustomer } from "@/pos/lib/devices";
import CustomerPicker from "./CustomerPicker";
import { getBusiness, saveEnquiry, closeEnquiry, rescheduleEnquiry, logEnquiryContact, sameCustomer, type EnquiryContact, type Enquiry, type DirectoryCustomer } from "./business";

const statusLabel: Record<Enquiry["status"], string> = {
  open: "Open follow-up",
  converted: "Sale completed",
  lost: "Closed - no sale",
};

function EnquiryCard({ enquiry, sales, refresh }: { enquiry: Enquiry; sales: Sale[]; refresh: () => void }) {
  const [outcome, setOutcome] = useState(enquiry.outcome ?? ""); const [saleId, setSaleId] = useState(enquiry.saleId ?? ""); const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<EnquiryContact["channel"]>("call"); const [contactNote, setContactNote] = useState("");
  const [owner, setOwner] = useState(enquiry.owner); const [due, setDue] = useState(enquiry.followUpAt.slice(0, 16));
  const matchingSales = sales.filter((sale) => !sale.isDemo && (!sale.lifecycle || sale.lifecycle === "completed") && sameCustomer(sale.customer, enquiry.customer));
  const linkedSale = sales.find((sale) => sale.id === enquiry.saleId);
  const run = async (action: () => Promise<unknown>, success?: string) => { setBusy(true); try { await action(); refresh(); if (success) toast.success(success); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update enquiry."); } finally { setBusy(false); } };
  return <article className="border border-border rounded-lg p-4 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
      <div><p className="font-medium">{enquiry.customer.name} - {enquiry.customer.phone}</p><p>{enquiry.request}</p></div>
      <span className="text-xs rounded-full bg-secondary px-2 py-1 text-muted-foreground">{statusLabel[enquiry.status]}</span>
    </div>
    <p className="text-sm text-muted-foreground">Owner: {enquiry.owner} - Follow up {new Date(enquiry.followUpAt).toLocaleString()}
      {enquiry.status === "open" && Date.parse(enquiry.followUpAt) < Date.now() ? <span className="ml-2 inline-flex items-center gap-1 font-medium text-destructive"><AlarmClock className="h-4 w-4" aria-hidden="true" />Overdue</span> : null}</p>
    {enquiry.contacts?.length ? <ul className="text-sm space-y-1 border-l-2 border-border pl-4">{enquiry.contacts.map((entry, index) =>
      <li key={index}>{new Date(entry.at).toLocaleString()} - {entry.channel} - {entry.by}: {entry.note}</li>)}</ul> : null}
    {enquiry.status === "open" ? <div className="space-y-4">
      <div className="rounded-md bg-secondary/50 p-4 text-sm text-muted-foreground">
        Keep this open while you are still chasing the customer. When the customer buys, link the completed sale and close it as completed. If they are no longer buying, close it as no sale so it leaves the open list.
      </div>
      <div className="flex flex-wrap gap-2"><select aria-label="Contact channel" className="border rounded p-2 bg-background" value={channel} onChange={(event) => setChannel(event.target.value as EnquiryContact["channel"])}>
        {["call", "whatsapp", "sms", "email", "visit"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
        <Input aria-label="Contact note" className="flex-1 min-w-48" placeholder="What was said / agreed" value={contactNote} onChange={(event) => setContactNote(event.target.value)} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { await logEnquiryContact(enquiry.id, owner, channel, contactNote); setContactNote(""); }, "Contact note saved.")}>Log contact</Button></div>
      <div className="flex flex-wrap gap-2"><Input aria-label="Follow-up owner" value={owner} onChange={(event) => setOwner(event.target.value)} /><Input aria-label="Next follow-up" type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => rescheduleEnquiry(enquiry.id, due, owner), "Follow-up updated.")}>Update follow-up</Button></div>
      <Input aria-label="Follow-up close note" placeholder="Close note, e.g. customer bought iPhone X or chose not to proceed" value={outcome} onChange={(event) => setOutcome(event.target.value)} />
      <select aria-label="Completed sale for enquiry" className="w-full border rounded p-2 bg-background" value={saleId} onChange={(event) => setSaleId(event.target.value)}><option value="">Choose completed sale for this customer</option>
        {matchingSales.map((sale) => <option key={sale.id} value={sale.id}>{sale.saleNumber} - {new Date(sale.createdAt).toLocaleDateString()}</option>)}</select>
      {!matchingSales.length && <p className="text-xs text-muted-foreground">No completed POS sale is linked to this customer yet. Complete the sale first, then come back here to close this as completed.</p>}
      <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy || !saleId} onClick={() => void run(() => closeEnquiry(enquiry.id, "converted", outcome, saleId), "Follow-up closed as sale completed.")}>Close as sale completed</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => closeEnquiry(enquiry.id, "lost", outcome), "Follow-up closed as no sale.")}>Close as no sale</Button></div>
    </div> : <div className="rounded-md bg-secondary/40 p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{statusLabel[enquiry.status]}</p>
      {linkedSale && <p>Linked sale: {linkedSale.saleNumber}</p>}
      <p>{enquiry.outcome || "No close note recorded."}</p>
    </div>}
  </article>;
}
export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]); const [sales, setSales] = useState<Sale[]>([]);
  const [customer, setCustomer] = useState<SaleCustomer>(); const [request, setRequest] = useState("");
  const [owner, setOwner] = useState(""); const [due, setDue] = useState(""); const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("open");
  const load = () => Promise.all([getBusiness(), getSales()]).then(([state, orders]) => { setEnquiries(state.enquiries); setSales(orders); }).catch(() => toast.error("Could not load enquiries."));
  useEffect(() => { void load(); getAuth().then((user) => setOwner(user?.name ?? "")); }, []);
  const visible = enquiries.filter((enquiry) => filter === "all" || enquiry.status === filter);
  return <div className="space-y-4">
    <form className="glass-card p-4 space-y-4" onSubmit={async (event) => {
      event.preventDefault(); if (!customer?.id) { toast.error("Select or save a customer first."); return; } setBusy(true);
      try { await saveEnquiry({ customer: customer as DirectoryCustomer, request, owner, followUpAt: due }); setRequest(""); setDue(""); await load(); toast.success("Follow-up saved."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not save enquiry."); } finally { setBusy(false); }
    }}>
      <p className="font-medium">Meaningful customer enquiry</p><CustomerPicker value={customer} onChange={setCustomer} />
      <label className="block text-sm">Product / customer request<Input required value={request} onChange={(event) => setRequest(event.target.value)} /></label>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Owner<Input required value={owner} onChange={(event) => setOwner(event.target.value)} /></label>
      <label className="text-sm">Follow-up date<Input required type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} /></label></div>
      <Button disabled={busy} type="submit">Save follow-up</Button>
    </form>
    <div className="flex flex-wrap items-center gap-2 text-sm"><span>Show</span><select className="border rounded p-2 bg-background" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="open">Open follow-ups</option><option value="converted">Sale completed</option><option value="lost">Closed - no sale</option><option value="all">All follow-ups</option></select>
      <span className="text-muted-foreground">{visible.length} shown</span></div>
    {visible.sort((a, b) => Date.parse(a.followUpAt) - Date.parse(b.followUpAt)).map((enquiry) => <EnquiryCard key={enquiry.id} enquiry={enquiry} sales={sales} refresh={load} />)}
    {!enquiries.length && <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><PhoneOff className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />No enquiries recorded.</div>}
    {enquiries.length > 0 && !visible.length && <p className="text-muted-foreground">No follow-ups match this view.</p>}
  </div>;
}