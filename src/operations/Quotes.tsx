import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuth, type User } from "@/frontdesk/lib/store";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import type { SaleCustomer } from "@/pos/lib/devices";
import CustomerPicker from "./CustomerPicker";
import { getPipeline, createQuote, sendQuote, reviseQuote, decideQuote, convertQuoteToOrder, quoteStatus, quoteSubtotal,
  QUOTE_DISCOUNT_LIMIT_PERCENT, type Quote, type QuoteLine } from "./pipeline";

export interface QuoteSeed { customer?: SaleCustomer; lines?: QuoteLine[]; enquiryId?: string; sourcingId?: string; note?: string; }
const blankLine = (): QuoteLine => ({ name: "", quantity: 1, unitPrice: 0 });

function LineEditor({ lines, onChange }: { lines: QuoteLine[]; onChange: (lines: QuoteLine[]) => void }) {
  const set = (index: number, patch: Partial<QuoteLine>) => onChange(lines.map((line, i) => i === index ? { ...line, ...patch } : line));
  return <div className="space-y-2">
    {lines.map((line, index) => <div key={index} className="flex flex-wrap gap-2">
      <Input aria-label={"Quote product " + (index + 1)} className="flex-1 min-w-48" placeholder="Product" value={line.name} onChange={(event) => set(index, { name: event.target.value })} />
      <Input aria-label={"Quote quantity " + (index + 1)} className="w-20" type="number" min={1} step={1} value={line.quantity} onChange={(event) => set(index, { quantity: Number(event.target.value) })} />
      <Input aria-label={"Quote unit price " + (index + 1)} className="w-32" type="number" min={0} step="0.01" value={line.unitPrice} onChange={(event) => set(index, { unitPrice: Number(event.target.value) })} />
      {lines.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(lines.filter((_, i) => i !== index))}>Remove</Button>}
    </div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, blankLine()])}>Add line</Button>
  </div>;
}

function QuoteCard({ quote, user, refresh }: { quote: Quote; user: User | null; refresh: () => void }) {
  const status = quoteStatus(quote); const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState(quote.lines); const [discount, setDiscount] = useState(String(quote.discount));
  const [reason, setReason] = useState(""); const [due, setDue] = useState(""); const [showHistory, setShowHistory] = useState(false);
  const by = user?.name ?? "";
  const run = async (action: () => Promise<unknown>, message?: string) => {
    setBusy(true); try { await action(); if (message) toast.success(message); refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update quote."); } finally { setBusy(false); }
  };
  return <article className="border border-border rounded-lg p-4 space-y-2">
    <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{quote.number} · {quote.customer.name} · {quote.customer.phone}</p><span className="text-sm capitalize">{status}</span></div>
    {quote.lines.map((line, index) => <p key={index} className="text-sm">{line.name} × {line.quantity} · {formatCurrency(line.unitPrice * line.quantity)}</p>)}
    <p className="text-sm">{quote.discount > 0 ? "Discount " + formatCurrency(quote.discount) + " · " : ""}Total <span className="font-medium">{formatCurrency(quote.total)}</span> · valid until {new Date(quote.validUntil).toLocaleDateString()} · owner {quote.owner}</p>
    {quote.declineReason && <p className="text-sm">Declined: {quote.declineReason}</p>}
    {editing && <div className="space-y-2 border border-border rounded p-3"><LineEditor lines={lines} onChange={setLines} />
      <label className="block text-sm">Discount<Input aria-label="Revised discount" type="number" min={0} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
      <Button size="sm" disabled={busy} onClick={() => void run(async () => { await reviseQuote(quote.id, by, user?.role, lines, Number(discount) || 0); setEditing(false); }, "Quote revised.")}>Save revision</Button></div>}
    <div className="flex flex-wrap gap-2">
      {status === "draft" && <Button size="sm" disabled={busy} onClick={() => void run(() => sendQuote(quote.id, by), "Quote sent.")}>Send to customer</Button>}
      {(status === "draft" || status === "sent") && <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>{editing ? "Cancel revision" : "Revise"}</Button>}
      {status === "sent" && <Button size="sm" disabled={busy} onClick={() => void run(() => decideQuote(quote.id, "accepted", by, ""), "Quote accepted.")}>Customer accepted</Button>}
      <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)}>{showHistory ? "Hide history" : "History"}</Button>
    </div>
    {status === "sent" && <div className="flex flex-wrap gap-2"><Input aria-label="Decline reason" className="flex-1 min-w-48" placeholder="Why the customer declined" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => decideQuote(quote.id, "declined", by, reason))}>Customer declined</Button></div>}
    {status === "accepted" && !quote.saleId && <div className="flex flex-wrap gap-2"><Input aria-label="Expected collection date" type="datetime-local" className="w-56" value={due} onChange={(event) => setDue(event.target.value)} />
      <Button size="sm" disabled={busy || !due} onClick={() => void run(() => convertQuoteToOrder(quote.id, by, new Date(due).toISOString()), "Order created. Find it under Orders & collection.")}>Convert to order</Button></div>}
    {quote.saleId && <p className="text-sm text-muted-foreground">Converted to an order. Take the deposit under Orders & collection.</p>}
    {showHistory && <ul className="text-xs text-muted-foreground space-y-1 border-l-2 border-border pl-3">{quote.history.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString()} · {entry.by}: {entry.change}</li>)}</ul>}
  </article>;
}

export default function Quotes({ seed, onSeedUsed }: { seed?: QuoteSeed; onSeedUsed?: () => void }) {
  const [quotes, setQuotes] = useState<Quote[]>([]); const [user, setUser] = useState<User | null>(null); const [filter, setFilter] = useState("all");
  const [customer, setCustomer] = useState<SaleCustomer>(); const [lines, setLines] = useState<QuoteLine[]>([blankLine()]);
  const [discount, setDiscount] = useState("0"); const [validDays, setValidDays] = useState("7"); const [quoteNote, setQuoteNote] = useState("");
  const [links, setLinks] = useState<{ enquiryId?: string; sourcingId?: string }>({}); const [busy, setBusy] = useState(false);
  const load = () => getPipeline().then((state) => setQuotes(state.quotes)).catch(() => toast.error("Could not load quotes."));
  useEffect(() => { void load(); getAuth().then(setUser); }, []);
  useEffect(() => {
    if (!seed) return;
    setCustomer(seed.customer); setLines(seed.lines?.length ? seed.lines : [blankLine()]); setQuoteNote(seed.note ?? "");
    setLinks({ enquiryId: seed.enquiryId, sourcingId: seed.sourcingId }); onSeedUsed?.();
  }, [seed]);
  const total = Math.max(0, quoteSubtotal(lines) - (Number(discount) || 0));
  const counts = ["draft", "sent", "accepted", "declined", "expired"].map((state) => [state, quotes.filter((quote) => quoteStatus(quote) === state).length] as const);
  return <div className="space-y-4">
    <form className="glass-card p-4 space-y-3" onSubmit={async (event) => {
      event.preventDefault(); if (!customer?.name) { toast.error("Select a customer first."); return; } setBusy(true);
      try {
        await createQuote({ customer, lines, discount: Number(discount) || 0, validDays: Number(validDays), owner: user?.name ?? "", role: user?.role, note: quoteNote, ...links });
        setLines([blankLine()]); setDiscount("0"); setQuoteNote(""); setLinks({}); await load(); toast.success("Quote saved as a draft.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save quote."); } finally { setBusy(false); }
    }}>
      <p className="font-medium">New quote{links.sourcingId ? " (from sourcing request)" : links.enquiryId ? " (from enquiry)" : ""}</p>
      <CustomerPicker value={customer} onChange={setCustomer} /><LineEditor lines={lines} onChange={setLines} />
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Discount<Input aria-label="Quote discount" type="number" min={0} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
        <label className="text-sm">Valid for (days)<Input aria-label="Quote validity days" type="number" min={1} step={1} value={validDays} onChange={(event) => setValidDays(event.target.value)} /></label>
        <label className="text-sm">Note<Input aria-label="Quote note" value={quoteNote} onChange={(event) => setQuoteNote(event.target.value)} /></label>
      </div>
      <p className="text-xs text-muted-foreground">Discounts above {QUOTE_DISCOUNT_LIMIT_PERCENT}% need an admin account.</p>
      <div className="flex items-center gap-3"><Button type="submit" disabled={busy}>Save draft</Button><span className="text-sm">Total {formatCurrency(total)}</span></div>
    </form>
    <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Show<select className="ml-2 border rounded p-2 bg-background" value={filter} onChange={(event) => setFilter(event.target.value)}>
      <option value="all">All ({quotes.length})</option>{counts.map(([state, count]) => <option key={state} value={state}>{state} ({count})</option>)}</select></label></div>
    {quotes.filter((quote) => filter === "all" || quoteStatus(quote) === filter).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((quote) => <QuoteCard key={quote.id + quote.updatedAt} quote={quote} user={user} refresh={load} />)}
    {!quotes.length && <p className="text-muted-foreground">No quotes yet.</p>}
  </div>;
}
