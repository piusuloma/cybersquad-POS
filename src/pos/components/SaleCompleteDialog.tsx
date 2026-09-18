import { CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import type { AppSettings } from "@/frontdesk/lib/store";
import { printSaleReceipt } from "@/pos/lib/receipt";
import type { Sale } from "@/pos/lib/store";

interface SaleCompleteDialogProps {
  sale: Sale | null;
  settings?: Partial<AppSettings>;
  onNewSale: () => void;
}

export default function SaleCompleteDialog({ sale, settings, onNewSale }: SaleCompleteDialogProps) {
  return (
    <Dialog open={sale !== null} onOpenChange={(open) => !open && onNewSale()}>
      <DialogContent className="sm:max-w-sm" style={{ maxWidth: "24rem" }}>
        {sale && (
          <>
            <DialogHeader className="items-center text-center">
              <CheckCircle2 className="w-12 h-12 text-success" />
              <DialogTitle>Sale Complete</DialogTitle>
              <DialogDescription>{sale.saleNumber}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-foreground">{formatCurrency(sale.total)}</span>
              </div>
              {sale.paymentMode === "cash" && sale.cashTendered !== undefined && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cash Tendered</span>
                    <span className="text-foreground">{formatCurrency(sale.cashTendered)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Change Due</span>
                    <span className="font-semibold text-success">{formatCurrency(sale.changeDue ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="sm:flex-col gap-2">
              <Button className="w-full" variant="outline" onClick={() => printSaleReceipt(sale, settings)}>
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
              <Button className="w-full" onClick={onNewSale}>
                New Sale
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
