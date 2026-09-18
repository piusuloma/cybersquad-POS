import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DEVICE_TYPE_LABELS, getTickets, STATUS_PROGRESS, Ticket } from "@/frontdesk/lib/store";
import SearchField from "@/frontdesk/components/SearchField";
import StatusBadge from "@/frontdesk/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, UserRound } from "lucide-react";

type CustomerGroup = {
  key: string;
  name: string;
  phone: string;
  email: string;
  tickets: Ticket[];
  latestUpdatedAt: number;
};

function ticketDeviceType(ticket: Ticket) {
  return ticket.device.type ?? "other";
}

function ticketProgress(status: Ticket["status"]) {
  return STATUS_PROGRESS[status] ?? 0;
}

export default function CustomerRecords() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState((searchParams.get("query") ?? "").trim());
  const [deviceFilter, setDeviceFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    void getTickets()
      .then((data) => {
        if (mounted) setTickets(data);
      })
      .catch(() => {
        if (mounted) setTickets([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const customerGroups = useMemo(() => {
    const grouped = new Map<string, CustomerGroup>();

    for (const ticket of tickets) {
      const emailKey = ticket.customer.email.trim().toLowerCase();
      const phoneKey = ticket.customer.phone.trim();
      const key = emailKey || phoneKey || ticket.customer.id;

      const existing = grouped.get(key);
      const updatedAt = new Date(ticket.updatedAt).getTime();
      if (existing) {
        existing.tickets.push(ticket);
        existing.latestUpdatedAt = Math.max(existing.latestUpdatedAt, updatedAt);
        continue;
      }

      grouped.set(key, {
        key,
        name: ticket.customer.name,
        phone: ticket.customer.phone,
        email: ticket.customer.email,
        tickets: [ticket],
        latestUpdatedAt: updatedAt,
      });
    }

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        tickets: [...group.tickets].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
      }))
      .sort((a, b) => b.latestUpdatedAt - a.latestUpdatedAt);
  }, [tickets]);

  const deviceFilters = useMemo(() => {
    const availableTypes = Array.from(
      new Set(customerGroups.flatMap((group) => group.tickets.map(ticketDeviceType)))
    ).sort((left, right) => DEVICE_TYPE_LABELS[left].localeCompare(DEVICE_TYPE_LABELS[right]));

    return [
      { value: "all", label: "All Device Types" },
      ...availableTypes.map((value) => ({
        value,
        label: DEVICE_TYPE_LABELS[value],
      })),
    ];
  }, [customerGroups]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customerGroups.filter((group) => {
      const matchesDeviceFilter =
        deviceFilter === "all" ||
        group.tickets.some((ticket) => ticketDeviceType(ticket) === deviceFilter);

      if (!matchesDeviceFilter) return false;
      if (!normalizedQuery) return true;

      const customerHaystack = [group.name, group.phone, group.email]
        .join(" ")
        .toLowerCase();
      if (customerHaystack.includes(normalizedQuery)) return true;

      return group.tickets.some((ticket) =>
        [
          ticket.jobId,
          ticket.device.make,
          ticket.device.model,
          ticket.device.imei,
          ticket.issueReported ?? "",
          ticket.customerNote ?? "",
          ticket.diagnosis ?? "",
          ticket.device.type ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [customerGroups, query, deviceFilter]);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading customer records...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Check previous repairs, issues reported, device type, and live progress for returning customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{customerGroups.length} customer{customerGroups.length === 1 ? "" : "s"}</Badge>
          <Badge variant="secondary">
            {
              customerGroups.filter((group) => group.tickets.length > 1).length
            } returning
          </Badge>
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <SearchField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer, job ID, issue, diagnosis, IMEI..."
          />
          <Select
            value={deviceFilter}
            onValueChange={setDeviceFilter}
          >
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Filter by device type" />
            </SelectTrigger>
            <SelectContent>
              {deviceFilters.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setDeviceFilter("all");
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          {customerGroups.length === 0 ? (
            <p className="text-muted-foreground">No customer records yet. Create your first ticket.</p>
          ) : (
            <p className="text-muted-foreground">No customer records match your search.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const completedCount = group.tickets.filter((ticket) => ticket.status === "completed").length;
            const activeCount = group.tickets.filter((ticket) => !["completed", "cancelled", "warranty_void"].includes(ticket.status))
              .length;

            return (
              <div key={group.key} className="glass-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">{group.name}</h2>
                      {group.tickets.length > 1 && <Badge>Returning</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.phone} {group.email ? `- ${group.email}` : ""}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {group.tickets.length} ticket{group.tickets.length === 1 ? "" : "s"} | {completedCount} completed | {activeCount} active
                  </div>
                </div>

                <div className="space-y-3">
                  {group.tickets.map((ticket) => {
                    const progress = ticketProgress(ticket.status);
                    const deviceType = ticketDeviceType(ticket);

                    return (
                      <div key={ticket.id} className="rounded-lg border border-border bg-secondary/30 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-mono text-sm font-semibold text-primary">{ticket.jobId}</p>
                            <p className="text-sm text-foreground">
                              {DEVICE_TYPE_LABELS[deviceType]} - {ticket.device.make} {ticket.device.model}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              IMEI / Serial: {ticket.device.imei}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="text-foreground font-medium">Issue:</span>{" "}
                              {ticket.issueReported || "Not captured"}
                            </p>
                            {ticket.customerNote && (
                              <p className="text-sm text-muted-foreground">
                                <span className="text-foreground font-medium">Note:</span>{" "}
                                {ticket.customerNote}
                              </p>
                            )}
                            {ticket.diagnosis && (
                              <p className="text-sm text-muted-foreground">
                                <span className="text-foreground font-medium">Diagnosis:</span>{" "}
                                {ticket.diagnosis}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-start lg:items-end gap-2">
                            <StatusBadge status={ticket.status} />
                            <Link to={`/ticket/${ticket.id}`} className="text-sm text-primary hover:underline">
                              Open Ticket
                            </Link>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{progress}%</span>
                          </div>
                          <div className="h-2 w-full rounded bg-secondary">
                            <div
                              className="h-full rounded bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
