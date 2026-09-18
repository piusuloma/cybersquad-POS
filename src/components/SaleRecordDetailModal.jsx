import { useEffect, useState } from "react";
import { Printer, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { formatCurrency } from "../frontdesk/lib/invoice";
import { getSettings, PAYMENT_MODE_LABELS } from "../frontdesk/lib/store";
import { printSaleReceipt } from "../pos/lib/receipt";

export function SaleRecordDetailModal({ open, onOpenChange, sale }) {
  const [settings, setSettings] = useState(undefined);

  useEffect(() => {
    if (!open) return;
    getSettings().then(setSettings);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]" style={{ maxWidth: "42rem", maxHeight: "85vh" }}>
        {sale && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                <div>
                  <DialogTitle>{sale.saleNumber}</DialogTitle>
                  <DialogDescription>
                    {new Date(sale.createdAt).toLocaleString()} · Cashier {sale.cashierName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{sale.channel === "website" ? "Website" : "In-Store"}</Badge>
              <Badge variant="outline">{PAYMENT_MODE_LABELS[sale.paymentMode] ?? sale.paymentMode}</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.lines.map((line) => (
                  <TableRow key={line.productId}>
                    <TableCell>{line.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{line.sku ?? "—"}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>{formatCurrency(line.unitPrice)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(line.unitPrice * line.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-1 border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              {sale.paymentMode === "cash" && sale.cashTendered !== undefined && (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Cash Tendered</span>
                    <span>{formatCurrency(sale.cashTendered)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Change Due</span>
                    <span>{formatCurrency(sale.changeDue ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => printSaleReceipt(sale, settings)}>
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
