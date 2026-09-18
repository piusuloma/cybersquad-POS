import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { formatCurrency } from "../frontdesk/lib/invoice";
import { PAYMENT_MODE_LABELS } from "../frontdesk/lib/store";
import { getSales } from "../pos/lib/store";
import { SaleRecordDetailModal } from "./SaleRecordDetailModal";

const PAGE_SIZE = 15;

export function SalesRecords() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let mounted = true;
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
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...sales].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!query) return sorted;
    return sorted.filter(
      (sale) =>
        sale.saleNumber.toLowerCase().includes(query) ||
        sale.cashierName.toLowerCase().includes(query) ||
        sale.lines.some((line) => line.name.toLowerCase().includes(query))
    );
  }, [sales, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openSale = (sale) => {
    setSelectedSale(sale);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Sales</h1>
        <p className="text-muted-foreground">
          Every sale recorded on this device's POS terminal — not yet synced to a shared backend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Sale Records</CardTitle>
              <CardDescription>{filtered.length} sale(s)</CardDescription>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by sale #, cashier, or item..."
                className="pl-8 w-[280px]"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No sales found
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                pageItems.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm font-medium">{sale.saleNumber}</TableCell>
                    <TableCell>{sale.cashierName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sale.channel === "website" ? "Website" : "In-Store"}
                      </Badge>
                    </TableCell>
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
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openSale(sale)} aria-label={`Open ${sale.saleNumber}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-3 pt-4">
              <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of{" "}
                <span className="font-medium text-foreground">{pages}</span>
              </span>
              <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SaleRecordDetailModal open={showDetail} onOpenChange={setShowDetail} sale={selectedSale} />
    </div>
  );
}
