import { useEffect, useMemo, useState } from "react";
import { History, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/frontdesk/lib/invoice";
import { getShifts } from "@/pos/lib/store";

interface ShiftHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShiftHistoryDialog({ open, onOpenChange }: ShiftHistoryDialogProps) {
  const [shifts, setShifts] = useState<Awaited<ReturnType<typeof getShifts>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    getShifts()
      .then((data) => {
        if (mounted) setShifts(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  const sorted = useMemo(
    () => [...shifts].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()),
    [shifts]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]" style={{ maxWidth: "42rem", maxHeight: "85vh" }}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-muted-foreground" />
            <div>
              <DialogTitle>Shift History</DialogTitle>
              <DialogDescription>Opening/closing float and cash reconciliation for this device.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opened</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead>Opening Float</TableHead>
                <TableHead>Closing Float</TableHead>
                <TableHead>Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No shifts recorded yet
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                sorted.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="text-sm">{new Date(shift.openedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">
                      {shift.closedAt ? (
                        new Date(shift.closedAt).toLocaleString()
                      ) : (
                        <Badge variant="outline">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(shift.openingFloat)}</TableCell>
                    <TableCell>{shift.closingFloat !== undefined ? formatCurrency(shift.closingFloat) : "—"}</TableCell>
                    <TableCell>
                      {shift.variance === undefined ? (
                        "—"
                      ) : (
                        <span
                          className={
                            shift.variance === 0
                              ? "text-foreground"
                              : shift.variance > 0
                              ? "text-success"
                              : "text-destructive"
                          }
                        >
                          {formatCurrency(Math.abs(shift.variance))}
                          {shift.variance > 0 ? " over" : shift.variance < 0 ? " short" : ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
