import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuth } from "@/frontdesk/lib/store";
import { getSales, type Sale } from "@/pos/lib/store";
import type { SaleCustomer } from "@/pos/lib/devices";
import CustomerPicker from "./CustomerPicker";
import type { QuoteSeed } from "./Quotes";
import { getBusiness, saveEnquiry, closeEnquiry, rescheduleEnquiry, logEnquiryContact, sameCustomer, type EnquiryContact, type Enquiry, type DirectoryCustomer } from "./business";
function EnquiryCard({ enquiry, sales, refresh, onQuote }: { enquiry: Enquiry; sales: Sale[]; refresh: () => void; onQuote: (seed: QuoteSeed) => void }) {
  const [outcome, setOutcome] = useState(""); const [saleId, setSaleId] = useState(""); const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<EnquiryContact["channel"]>("call"); const [contactNote, setContactNote] = useState("");
  const [owner, setOwner] = useState(enquiry.owner); const [due, setDue] = useState(enquiry.followUpAt.slice(0, 16));
  const run = async (action: () => Promise<unknown>) => { setBusy(true); try { await action(); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update enquiry."); } finally { setBusy(false); } };
  return <article className="border border-border rounded-lg p-4 space-y-2">
    <p className="font-medium">{enquiry.customer.name} · {enquiry.customer.phone}</p><p>{enquiry.request}</p>
    <p className="text-sm">{enquiry.status} · {enquiry.owner} ? Follow up {new Date(enquiry.followUpAt).toLocaleString()}
      {enquiry.status === "open" && Date.parse(enquiry.followUpAt) < Date.now() ? " ? Overdue" : ""}</p>
    {enquiry.contacts?.length ? <ul className="text-sm space-y-1 border-l-2 border-border pl-3">{enquiry.contacts.map((entry, index) =>
      <li key={index}>{new Date(entry.at).toLocaleString()} · {entry.channel} · {entry.by}: {entry.note}</li>)}</ul> : null}
    {enquiry.status === "open" ? <div className="space-y-2">
      <div className="flex flex-wrap gap-2"><select aria-label="Contact channel" className="border rounded p-2 bg-background" value={channel} onChange={(event) => setChannel(event.target.value as EnquiryContact["channel"])}>
        {["call", "whatsapp", "sms", "email", "visit"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
        <Input aria-label="Contact note" className="flex-1 min-w-48" placeholder="What was said / agreed" value={contactNote} onChange={(event) => setContactNote(event.target.value)} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { await logEnquiryContact(enquiry.id, owner, channel, contactNote); setContactNote(""); })}>Log contact</Button></div>
      <div className="flex flex-wrap gap-2"><Input aria-label="Follow-up owner" value={owner} onChange={(event) => setOwner(event.target.value)} /><Input aria-label="Next follow-up" type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => rescheduleEnquiry(enquiry.id, due, owner))}>Update follow-up</Button></div>
      <Input aria-label="Enquiry outcome or lost reason" placeholder="Outcome / lost reason" value={outcome} onChange={(event) => setOutcome(event.target.value)} />
      <select aria-label="Completed sale for enquiry" className="w-full border rounded p-2 bg-background" value={saleId} onChange={(event) => setSaleId(event.target.value)}><option value="">Link a completed sale</option>
        {sales.filter((sale) => !sale.isDemo && (!sale.lifecycle || sale.lifecycle === "completed") && sameCustomer(sale.customer, enquiry.customer)).map((sale) => <option key={sale.id} value={sale.id}>{sale.saleNumber}</option>)}</select>
      <div className="flex gap-2"><Button size="sm" disabled={busy || !saleId} onClick={() => void run(() => closeEnquiry(enquiry.id, "converted", outcome, saleId))}>Mark converted</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => closeEnquiry(enquiry.id, "lost", outcome))}>Close as lost</Button>
        <Button size="sm" variant="outline" onClick={() => onQuote({ customer: enquiry.customer, enquiryId: enquiry.id, lines: [{ name: enquiry.request, quantity: 1, unitPrice: 0 }] })}>Create quote</Button></div>
    </div> : <p className="text-sm text-muted-foreground">{enquiry.outcome}</p>}
  </article>;
}
export default function Enquiries({ onQuote }: { onQuote: (seed: QuoteSeed) => void }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]); const [sales, setSales] = useState<Sale[]>([]);
  const [customer, setCustomer] = useState<SaleCustomer>(); const [request, setRequest] = useState("");
  const [owner, setOwner] = useState(""); const [due, setDue] = useState(""); const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("open");
  const load = () => Promise.all([getBusiness(), getSales()]).then(([state, orders]) => { setEnquiries(state.enquiries); setSales(orders); }).catch(() => toast.error("Could not load enquiries."));
  useEffect(() => { void load(); getAuth().then((user) => setOwner(user?.name ?? "")); }, []);
  return <div className="space-y-4">
    <form className="glass-card p-4 space-y-3" onSubmit={async (event) => {
      event.preventDefault(); if (!customer?.id) { toast.error("Select or save a customer first."); return; } setBusy(true);
      try { await saveEnquiry({ customer: customer as DirectoryCustomer, request, owner, followUpAt: due }); setRequest(""); setDue(""); await load(); toast.success("Follow-up saved."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not save enquiry."); } finally { setBusy(false); }
    }}>
      <p className="font-medium">Meaningful customer enquiry</p><CustomerPicker value={customer} onChange={setCustomer} />
      <label className="block text-sm">Product / customer request<Input required value={request} onChange={(event) => setRequest(event.target.value)} /></label>
      <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Owner<Input required value={owner} onChange={(event) => setOwner(event.target.value)} /></label>
      <label className="text-sm">Follow-up date<Input required type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} /></label></div>
      <Button disabled={busy} type="submit">Save follow-up</Button>
    </form>
    <label className="text-sm">Show<select className="ml-2 border rounded p-2 bg-background" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="open">Open</option><option value="converted">Converted</option><option value="lost">Lost</option><option value="all">All</option></select></label>
    {enquiries.filter((enquiry) => filter === "all" || enquiry.status === filter).sort((a, b) => Date.parse(a.followUpAt) - Date.parse(b.followUpAt)).map((enquiry) => <EnquiryCard key={enquiry.id} enquiry={enquiry} sales={sales} refresh={load} onQuote={onQuote} />)}
    {!enquiries.length && <p className="text-muted-foreground">No enquiries recorded.</p>}
  </div>;
}
