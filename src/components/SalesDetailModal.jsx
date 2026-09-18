import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ShoppingCart, Loader2 } from "lucide-react";
import { getSales } from "../pos/lib/store";
import { PAYMENT_MODE_LABELS } from "../frontdesk/lib/store";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const formatCurrency = (val) =>
  `₦${Number(val || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

function isWithinRange(createdAt, range) {
  if (range === "all") return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const start = range === "today" ? new Date().setHours(0, 0, 0, 0) : now - days * 24 * 60 * 60 * 1000;
  return created >= start;
}

export function SalesDetailModal({ open, onOpenChange }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("today");

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    getSales()
      .then((data) => {
        if (mounted) setSales(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  const filtered = useMemo(
    () =>
      sales
        .filter((sale) => isWithinRange(sale.createdAt, range))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sales, range]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Inline styles, not just classNames: this dialog can render under the
          .frontdesk-theme scope (POS), whose frozen legacy stylesheet defines
          higher-specificity ".frontdesk-theme .max-w-lg" rules that silently
          beat plain utility classes like "sm:max-w-3xl". Inline style always wins. */}
      <DialogContent className="sm:max-w-3xl max-h-[90vh]" style={{ maxWidth: "48rem", maxHeight: "90vh" }}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            <div>
              <DialogTitle>Sales</DialogTitle>
              <DialogDescription>
                Stored locally on this device — not yet synced to a shared backend.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
          <div className="space-y-3">
            <div className="flex items-center justify-end">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sales found
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{sale.cashierName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {sale.lines.reduce((sum, l) => sum + l.quantity, 0)} item(s)
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PAYMENT_MODE_LABELS[sale.paymentMode] ?? sale.paymentMode}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(sale.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
