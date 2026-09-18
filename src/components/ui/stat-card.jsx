import { Card, CardContent, CardHeader, CardTitle } from "./card";

// Shared metric-card look used across the admin dashboard (Dashboard
// Overview, Repair Performance, Sales Analytics) so every stat card shares
// the same visual language instead of each section inventing its own.
export function StatCard({ title, value, change, note, icon: Icon, color = "text-primary", bgColor = "bg-accent", onClick }) {
  const card = (
    <Card className={`border-l-4 border-l-primary h-full ${onClick ? "hover:bg-secondary/40 transition-colors" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value ?? "—"}</div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className={change.startsWith("+") ? "text-success" : "text-error"}>{change}</span> from previous
            period
          </p>
        )}
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </CardContent>
    </Card>
  );

  if (!onClick) return card;

  return (
    <button type="button" onClick={onClick} className="text-left w-full block">
      {card}
    </button>
  );
}
