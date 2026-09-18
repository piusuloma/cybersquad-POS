import React, { useState, useEffect } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { StatCard } from "./ui/stat-card";
import {
	AlertCircle,
	TrendingUp,
	Loader2,
	ShoppingCart,
	Store,
	Globe,
	ArrowRight,
} from "lucide-react";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { useApi } from "../hooks/useApi";
import { getSalesSummary } from "../pos/lib/store";
import { fetchWebsiteSalesSummary } from "../lib/websiteSales";
import { RepairPerformance } from "./RepairPerformance";

const FILTER_LABELS = {
	"1d": "Last 24 hours",
	"3d": "Last 3 days",
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	"90d": "Last 90 days",
	all: "All time",
};

const JOB_STATUS_COLORS = {
	active: "#8b5cf6",
	completed: "#14b8a6",
	cancelled: "#ef4444",
};

const formatCurrency = (val) =>
	`₦${Number(val).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

const formatDelta = (pct) => {
	if (pct === null || pct === undefined) return null;
	return pct >= 0 ? `+${pct}%` : `${pct}%`;
};

const formatDeltaFixed = (pct, decimals = 2) => {
	if (pct === null || pct === undefined) return null;
	const value = Number(pct);
	if (Number.isNaN(value)) return null;
	const fixed = value.toFixed(decimals);
	return value >= 0 ? `+${fixed}%` : `${fixed}%`;
};

const formatDay = (dateStr) => {
	const d = new Date(dateStr);
	return d.toLocaleDateString("en-US", { weekday: "short" });
};

const formatMonth = (monthStr) => {
	const [year, month] = monthStr.split("-");
	return new Date(year, month - 1).toLocaleDateString("en-US", {
		month: "short",
	});
};

const NairaIcon = ({ className }) => (
	<span className={`${className} font-semibold leading-none`}>₦</span>
);

export function DashboardOverview({ onViewSales, onViewSLA, onViewJobs }) {
	const [filter, setFilter] = useState("7d");
	const { api } = useApi();

	// Dashboard Stats State
	const [stats, setStats] = useState(null);
	const [statsLoading, setStatsLoading] = useState(false);
	const [statsError, setStatsError] = useState(null);

	// Sales Summary State (separate from repair stats — see the Sales page for full records)
	const [salesSummary, setSalesSummary] = useState(null);
	const [salesLoading, setSalesLoading] = useState(true);
	const [websiteSalesToday, setWebsiteSalesToday] = useState(null);

	useEffect(() => {
		let mounted = true;
		Promise.all([getSalesSummary("today"), fetchWebsiteSalesSummary(api, "today")]).then(
			([summary, website]) => {
				if (!mounted) return;
				setSalesSummary(summary);
				setWebsiteSalesToday(website);
				setSalesLoading(false);
			},
		);
		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Sales revenue for the SAME period as the repair stats filter below, so the
	// two can be combined into one "Total Business Revenue" figure.
	const [periodSalesRevenue, setPeriodSalesRevenue] = useState(null);
	const [periodSalesLoading, setPeriodSalesLoading] = useState(true);
	const [periodSalesIncludesWebsite, setPeriodSalesIncludesWebsite] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setPeriodSalesLoading(true);
		Promise.all([getSalesSummary(filter), fetchWebsiteSalesSummary(api, filter)]).then(
			([inStore, website]) => {
				if (cancelled) return;
				setPeriodSalesRevenue(inStore.totalRevenue + (website?.revenue ?? 0));
				setPeriodSalesIncludesWebsite(website !== null);
				setPeriodSalesLoading(false);
			},
		);
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filter]);

	// Recent Activity State
	const [recentActivity, setRecentActivity] = useState([]);
	const [activityLoading, setActivityLoading] = useState(false);
	const [activityError, setActivityError] = useState(null);

	// System Alerts State
	const [alerts, setAlerts] = useState([]);
	const [alertsLoading, setAlertsLoading] = useState(false);
	const [alertsError, setAlertsError] = useState(null);

	// Re-fetch stats when filter changes
	useEffect(() => {
		let cancelled = false;
		const fetchStats = async () => {
			setStatsLoading(true);
			setStatsError(null);
			try {
				const res = await api.get(
					`/jobs/admin/dashboard/stats/?range=${filter}`,
				);
				if (!cancelled) setStats(res?.data?.result || null);
			} catch (e) {
				if (!cancelled) setStatsError("Failed to load dashboard stats");
				console.error("Error fetching dashboard stats:", e);
			} finally {
				if (!cancelled) setStatsLoading(false);
			}
		};
		fetchStats();
		return () => {
			cancelled = true;
		};
	}, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

	// Fetch activity & alerts once on mount
	useEffect(() => {
		let cancelled = false;
		const fetchRecentActivity = async () => {
			setActivityLoading(true);
			setActivityError(null);
			try {
				const res = await api.get("/notifications/events/recent_activity/");
				const data = res?.data?.result?.results || [];
				if (!cancelled) setRecentActivity(Array.isArray(data) ? data : []);
			} catch (e) {
				if (!cancelled) setActivityError("Failed to load recent activity");
				console.error("Error fetching recent activity:", e);
			} finally {
				if (!cancelled) setActivityLoading(false);
			}
		};
		const fetchSystemAlerts = async () => {
			setAlertsLoading(true);
			setAlertsError(null);
			try {
				const res = await api.get("/notifications/events/system_alerts/");
				const data = res?.data?.result?.results || [];
				if (!cancelled) setAlerts(Array.isArray(data) ? data : []);
			} catch (e) {
				if (!cancelled) setAlertsError("Failed to load system alerts");
				console.error("Error fetching system alerts:", e);
			} finally {
				if (!cancelled) setAlertsLoading(false);
			}
		};
		fetchRecentActivity();
		fetchSystemAlerts();
		return () => {
			cancelled = true;
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Derived data from stats. Active Jobs / Pending Verifications / Active
	// Technicians were removed here — they're already covered in more useful
	// detail by the Repair Status breakdown below, so keeping them here too
	// was just the same numbers stated twice.
	const statsCards = stats
		? [
				{
					title: "Total Revenue",
					value: periodSalesLoading
						? formatCurrency(stats.stats.revenue)
						: formatCurrency(stats.stats.revenue + (periodSalesRevenue ?? 0)),
					change: formatDelta(stats.deltas.revenue_change_pct),
					note: periodSalesIncludesWebsite
						? "Repair + in-store + website sales"
						: "Repair + in-store sales (this device only)",
					icon: NairaIcon,
					color: "text-success",
					bgColor: "bg-success/10",
				},
			]
		: [];

	const jobVolumeData =
		stats?.weekly_volume?.map((d) => ({
			day: formatDay(d.day),
			jobs: d.count,
			fullDate: d.day,
		})) || [];

	const revenueData =
		stats?.revenue_trend?.map((d) => ({
			month: formatMonth(d.month),
			revenue: d.amount,
		})) || [];

	const jobDistribution = stats?.job_distribution
		? Object.entries(stats.job_distribution).map(([name, value]) => ({
				name: name.charAt(0).toUpperCase() + name.slice(1),
				value,
				color: JOB_STATUS_COLORS[name] || "#94a3b8",
			}))
		: [];

	const getJobVolumeTitle = () => {
		if (filter === "1d") return "Hourly Job Volume";
		if (filter === "3d" || filter === "7d") return "Daily Job Volume";
		if (filter === "30d" || filter === "90d") return "Weekly Job Volume";
		return "Job Volume";
	};

	const getActivityStatus = (category, priority) => {
		if (category === "user" && priority === "LOW") return "new";
		if (category === "job" && priority === "MEDIUM") return "success";
		if (priority === "HIGH") return "warning";
		return "pending";
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1>Dashboard Overview</h1>
					<p className="text-muted-foreground">
						Welcome back! Here's what's happening today.
					</p>
				</div>

				<Select value={filter} onValueChange={setFilter}>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder="Select Time Range" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="1d">Last 24 hours</SelectItem>
						<SelectItem value="3d">Last 3 days</SelectItem>
						<SelectItem value="7d">Last 7 days</SelectItem>
						<SelectItem value="30d">Last 30 days</SelectItem>
						<SelectItem value="90d">Last 90 days</SelectItem>
						<SelectItem value="all">All time</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Sales Today — revenue itself lives in the Total Revenue card above, so this
			    only surfaces what isn't shown anywhere else: count and top item. */}
			<div className="space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<h2 className="text-lg font-semibold">Sales Today</h2>
					{onViewSales && (
						<button
							type="button"
							onClick={onViewSales}
							className="flex items-center gap-1 text-sm text-primary hover:underline"
						>
							View All Sales
							<ArrowRight className="w-3.5 h-3.5" />
						</button>
					)}
				</div>

				{salesLoading ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<StatCard
							title="Sales Count"
							value={salesSummary?.totalSalesCount ?? 0}
							note="In-store, this device"
							icon={ShoppingCart}
							color="text-cyan-500"
							bgColor="bg-cyan-50"
						/>
						<StatCard
							title="Top Selling Item"
							value={salesSummary?.topSellingItems?.[0]?.name ?? "—"}
							icon={TrendingUp}
							color="text-purple-600"
							bgColor="bg-purple-50"
						/>
						<StatCard
							title="In-Store"
							value={salesSummary?.channelBreakdown?.in_store ?? 0}
							icon={Store}
							color="text-blue-500"
							bgColor="bg-blue-50"
						/>
						{websiteSalesToday ? (
							<StatCard
								title="Website"
								value={websiteSalesToday.count}
								note={formatCurrency(websiteSalesToday.revenue)}
								icon={Globe}
								color="text-indigo-500"
								bgColor="bg-indigo-50"
							/>
						) : (
							<StatCard
								title="Website"
								value="—"
								note="Not available yet"
								icon={Globe}
								color="text-muted-foreground"
								bgColor="bg-secondary"
							/>
						)}
					</div>
				)}
			</div>

			{/* Repair Performance — repair status snapshot + SLA risk, separate from sales */}
			<RepairPerformance onViewSLA={onViewSLA} onViewJobs={onViewJobs} />

			{/* Stats Grid */}
			{statsLoading ? (
				<div className="flex items-center justify-center py-10">
					<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				</div>
			) : statsError ? (
				<div className="text-center py-8 text-muted-foreground">
					<p>{statsError}</p>
				</div>
			) : (
				<>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						{statsCards.map((stat) => (
							<StatCard key={stat.title} {...stat} />
						))}
					</div>

					{/* Charts Row */}
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>{getJobVolumeTitle()}</CardTitle>
								<CardDescription>
									Jobs created — {FILTER_LABELS[filter] || "—"}
									{stats?.weekly_volume_change_pct !== undefined && (
										<span
											className={`ml-2 font-medium ${
												stats.weekly_volume_change_pct >= 0
													? "text-success"
													: "text-error"
											}`}
										>
											{formatDeltaFixed(stats.weekly_volume_change_pct, 2)} vs
											prev period
										</span>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={250}>
									<BarChart data={jobVolumeData}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
										/>
										<XAxis
											dataKey="day"
											stroke="hsl(var(--muted-foreground))"
										/>
										<YAxis
											stroke="hsl(var(--muted-foreground))"
											allowDecimals={false}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "hsl(var(--popover))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "8px",
											}}
										/>
										<Bar dataKey="jobs" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Revenue Trend</CardTitle>
								<CardDescription>
									Monthly revenue — {FILTER_LABELS[filter] || "—"}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={250}>
									<LineChart data={revenueData}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="hsl(var(--border))"
										/>
										<XAxis
											dataKey="month"
											stroke="hsl(var(--muted-foreground))"
										/>
										<YAxis
											stroke="hsl(var(--muted-foreground))"
											tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
										/>
										<Tooltip
											formatter={(v) => [formatCurrency(v), "Revenue"]}
											contentStyle={{
												backgroundColor: "hsl(var(--popover))",
												border: "1px solid hsl(var(--border))",
												borderRadius: "8px",
											}}
										/>
										<Line
											type="monotone"
											dataKey="revenue"
											stroke="#14b8a6"
											strokeWidth={3}
											dot={{ r: 4 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</div>

					{/* Job Status & Activity */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardHeader>
								<CardTitle>Job Status Distribution</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={200}>
									<PieChart>
										<Pie
											data={jobDistribution}
											cx="50%"
											cy="50%"
											innerRadius={50}
											outerRadius={80}
											paddingAngle={2}
											dataKey="value"
										>
											{jobDistribution.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
								<div className="grid grid-cols-2 gap-2 mt-4">
									{jobDistribution.map((item) => (
										<div key={item.name} className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{ backgroundColor: item.color }}
											/>
											<span className="text-xs">
												{item.name}: {item.value}
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						<Card className="md:col-span-2">
							<CardHeader>
								<CardTitle>Recent Activity</CardTitle>
								<CardDescription>Latest platform events</CardDescription>
							</CardHeader>
							<CardContent>
								{activityLoading ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
									</div>
								) : activityError ? (
									<div className="text-center py-8 text-muted-foreground">
										<p>{activityError}</p>
									</div>
								) : recentActivity.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground">
										<p>No recent activity</p>
									</div>
								) : (
									<div className="space-y-3 max-h-[280px] overflow-y-auto">
										{recentActivity.slice(0, 5).map((activity) => (
											<div
												key={activity.id}
												className="flex items-start gap-3 pb-3 border-b last:border-0"
											>
												<div
													className={`w-2 h-2 mt-2 rounded-full ${
														getActivityStatus(
															activity.category,
															activity.priority,
														) === "success"
															? "bg-success"
															: getActivityStatus(
																		activity.category,
																		activity.priority,
																  ) === "warning"
																? "bg-warning"
																: getActivityStatus(
																			activity.category,
																			activity.priority,
																	  ) === "pending"
																	? "bg-purple-500"
																	: "bg-gray-500"
													}`}
												/>
												<div className="flex-1 min-w-0">
													<p className="text-sm">
														{activity.actor_name}{" "}
														{activity.action.toLowerCase()}{" "}
														{activity.object_display}
													</p>
													<p className="text-xs text-muted-foreground mt-1">
														{activity.time_ago}
													</p>
												</div>
												<Badge variant="outline" className="text-xs">
													{activity.category}
												</Badge>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</>
			)}

			{/* Alerts */}
			<Card>
				<CardHeader>
					<CardTitle>System Alerts</CardTitle>
					<CardDescription>
						Important notifications requiring attention
					</CardDescription>
				</CardHeader>
				<CardContent>
					{alertsLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
						</div>
					) : alertsError ? (
						<div className="text-center py-8 text-muted-foreground">
							<p>{alertsError}</p>
						</div>
					) : alerts.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<p>No system alerts</p>
						</div>
					) : (
						<div className="space-y-3">
							{alerts.map((alert) => (
								<div
									key={alert.id}
									className="flex items-center gap-3 p-3 border rounded-lg"
								>
									<AlertCircle
										className={`w-5 h-5 ${
											alert.priority === "HIGH"
												? "text-error"
												: alert.priority === "MEDIUM"
													? "text-warning"
													: "text-purple-600"
										}`}
									/>
									<div className="flex-1">
										<h4 className="text-sm font-medium">{alert.title}</h4>
										<p className="text-xs text-muted-foreground">
											{alert.description}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{alert.time_ago}
										</p>
									</div>
									<Badge
										variant={
											alert.priority === "HIGH"
												? "destructive"
												: alert.priority === "MEDIUM"
													? "default"
													: "secondary"
										}
									>
										{alert.priority.toLowerCase()}
									</Badge>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
