import { useEffect, useState } from "react";
import {
  Wrench,
  Inbox,
  PackageSearch,
  Loader2,
  ClipboardCheck,
  PackageCheck,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowRight,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { StatCard } from "./ui/stat-card";

const STATUS_BUCKETS = [
  { key: "new", label: "New / Intake", icon: Inbox, color: "text-blue-500", bgColor: "bg-blue-50", status: "registered,awaiting_diagnosis_fee,awaiting_assignment,awaiting_reassignment" },
  { key: "awaiting_parts", label: "Awaiting Parts", icon: PackageSearch, color: "text-warning", bgColor: "bg-warning/10", status: "awaiting_parts_release" },
  { key: "in_progress", label: "Repair In Progress", icon: Wrench, color: "text-cyan-500", bgColor: "bg-cyan-50", status: "ready_for_repair,repairing,repair_in_progress" },
  { key: "qc_pending", label: "QC Pending", icon: ClipboardCheck, color: "text-purple-600", bgColor: "bg-purple-50", status: "submitted_for_qc_review,quality_check" },
  { key: "ready", label: "Ready for Collection", icon: PackageCheck, color: "text-indigo-500", bgColor: "bg-indigo-50", status: "ready_for_collection,ready_for_handover" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10", status: "delivered,closed" },
];

const SLA_BUCKETS = [
  { key: "on_track", label: "On Track", icon: ShieldCheck, color: "text-success", bgColor: "bg-success/10", sla_status: "On Track" },
  { key: "at_risk", label: "At Risk", icon: ShieldAlert, color: "text-warning", bgColor: "bg-warning/10", sla_status: "At Risk" },
  { key: "breached", label: "Breached", icon: ShieldX, color: "text-error", bgColor: "bg-error/10", sla_status: "Breached" },
];

export function RepairPerformance({ onViewSLA, onViewJobs }) {
  const { api } = useApi();

  const [statusCounts, setStatusCounts] = useState({});
  const [statusLoading, setStatusLoading] = useState(true);

  const [slaCounts, setSlaCounts] = useState({});
  const [slaStats, setSlaStats] = useState(null);
  const [slaLoading, setSlaLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCount = async (status) => {
      try {
        const res = await api.get("/jobs/admin/bookings/", { params: { status, page_size: 1 } });
        return res?.data?.pagination?.count ?? 0;
      } catch {
        return null;
      }
    };

    Promise.all(STATUS_BUCKETS.map((bucket) => fetchCount(bucket.status))).then((counts) => {
      if (!mounted) return;
      const next = {};
      STATUS_BUCKETS.forEach((bucket, i) => {
        next[bucket.key] = counts[i];
      });
      setStatusCounts(next);
      setStatusLoading(false);
    });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchSlaCount = async (sla_status) => {
      try {
        const res = await api.get("/sla/admin/overview/", { params: { sla_status, page_size: 1 } });
        return res?.data?.pagination?.count ?? 0;
      } catch {
        return null;
      }
    };

    Promise.all(SLA_BUCKETS.map((bucket) => fetchSlaCount(bucket.sla_status))).then((counts) => {
      if (!mounted) return;
      const next = {};
      SLA_BUCKETS.forEach((bucket, i) => {
        next[bucket.key] = counts[i];
      });
      setSlaCounts(next);
    });

    api
      .get("/sla/admin/dashboard/stats/", { params: { range: "today" } })
      .then((res) => {
        if (mounted) setSlaStats(res?.data?.result?.stats || null);
      })
      .catch(() => {
        if (mounted) setSlaStats(null);
      })
      .finally(() => {
        if (mounted) setSlaLoading(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            Repair Status
          </h2>
          <p className="text-sm text-muted-foreground">
            Live snapshot across all stores — click a stage to open Job Management.
          </p>
        </div>

        {statusLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {STATUS_BUCKETS.map((bucket) => (
              <StatCard
                key={bucket.key}
                title={bucket.label}
                value={statusCounts[bucket.key] ?? "—"}
                icon={bucket.icon}
                color={bucket.color}
                bgColor={bucket.bgColor}
                onClick={onViewJobs}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              SLA Risk
            </h2>
            <p className="text-sm text-muted-foreground">
              {slaStats?.breach_rate !== undefined
                ? `${slaStats.breach_rate}% breach rate today`
                : "Jobs at risk of, or past, their SLA deadline"}
            </p>
          </div>
          {onViewSLA && (
            <button
              type="button"
              onClick={onViewSLA}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View SLA Management
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {slaLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-3">
            {SLA_BUCKETS.map((bucket) => (
              <StatCard
                key={bucket.key}
                title={bucket.label}
                value={slaCounts[bucket.key] ?? "—"}
                icon={bucket.icon}
                color={bucket.color}
                bgColor={bucket.bgColor}
                onClick={onViewSLA}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
