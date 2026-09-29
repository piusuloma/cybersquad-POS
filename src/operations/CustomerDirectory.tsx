import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTickets, type Ticket } from "@/frontdesk/lib/store";
import { getSales, getRefunds, type Sale, type Refund } from "@/pos/lib/store";
import type { SaleCustomer } from "@/pos/lib/devices";
import { SaleRecordDetailModal } from "@/components/SaleRecordDetailModal";
import CustomerPicker from "./CustomerPicker";
import { getBusiness, getCustomerDirectory, sameCustomer, type DirectoryCustomer, type Enquiry } from "./business";
import { formatCurrency } from "@/frontdesk/lib/invoice";

export default function CustomerDirectory({ onOpenRepair }: { onOpenRepair: (ticket: Ticket) => void }) {
  const [customers, setCustomers] = useState<DirectoryCustomer[]>([]); const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<SaleCustomer>(); const [sales, setSales] = useState<Sale[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]); const [refunds, setRefunds] = useState<Refund[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null); const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const load = () => Promise.all([getCustomerDirectory(), getSales(), getTickets(), getRefunds(), getBusiness()]).then(([contacts, orders, repairs, returns, business]) => {
    setEnquiries(business.enquiries); setCustomers(contacts); setSales(orders); setTickets(repairs); setRefunds(returns);
  }).catch(() => toast.error("Could not load customer history."));
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4">
    <CustomerPicker value={customer} onChange={(value) => { setCustomer(value); void load(); }} />
    <Input placeholder="Search customer name, phone or email" aria-label="Search customer directory" value={query} onChange={(event) => setQuery(event.target.value)} />
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2 max-h-[36rem] overflow-y-auto">{customers.filter((entry) => (entry.name + " " + entry.phone + " " + entry.email).toLowerCase().includes(query.toLowerCase())).map((entry) =>
        <button key={entry.id} type="button" className="w-full text-left rounded-lg border border-border p-3 hover:bg-secondary" onClick={() => setCustomer(entry)}>
          <span className="block font-medium">{entry.name}</span><span className="text-sm text-muted-foreground">{entry.phone} · {entry.email}</span>
        </button>)}{!customers.length && <p className="text-muted-foreground">No customers yet.</p>}</div>
      <div className="space-y-3">{customer?.name ? <>
        <h3 className="font-semibold">{customer.name}: purchases, returns and repairs</h3>
        {sales.filter((sale) => !sale.isDemo && sameCustomer(sale.customer, customer)).map((sale) => <div key={sale.id} className="border border-border rounded p-3 space-y-1">
          <Button variant="link" onClick={() => setSelected(sale)}>{sale.saleNumber}</Button>
          <p className="text-sm">{formatCurrency(sale.total)} · {sale.lifecycle ?? "completed"}</p>
          {refunds.filter((refund) => refund.saleId === sale.id && refund.status !== "cancelled").map((refund) => <p key={refund.id} className="text-xs">Refund {formatCurrency(refund.total)} · {refund.status}</p>)}
        </div>)}
        {enquiries.filter((enquiry) => sameCustomer(enquiry.customer, customer)).map((enquiry) => <div key={enquiry.id} className="border border-border rounded p-3 text-sm">
          <p className="font-medium">Enquiry: {enquiry.request}</p><p>{enquiry.status} · {enquiry.owner} · follow up {new Date(enquiry.followUpAt).toLocaleDateString()} · {enquiry.contacts?.length ?? 0} contact(s)</p></div>)}
        {tickets.filter((ticket) => sameCustomer(ticket.customer, customer)).map((ticket) => <Button key={ticket.id} variant="outline" className="w-full justify-start" onClick={() => onOpenRepair(ticket)}>{ticket.jobId} · {ticket.device.model} · {ticket.status.replaceAll("_", " ")}</Button>)}
      </> : <p className="text-sm text-muted-foreground">Select a customer to see their history.</p>}</div>
    </div>
    <SaleRecordDetailModal open={Boolean(selected)} sale={selected} onOpenChange={(open: boolean) => { if (!open) { setSelected(null); void load(); } }} />
  </div>;
}
