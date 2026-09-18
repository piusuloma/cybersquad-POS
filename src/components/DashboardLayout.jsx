import { useState, useEffect } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "./ui/sidebar";
import {
	LayoutDashboard,
	Users,
	Briefcase,
	CreditCard,
	AlertTriangle,
	BarChart3,
	Settings,
	Bell,
	ShieldCheck,
	LogOut,
	Shield,
	Wrench,
	Clock,
	Store,
	MapPin,
	ShoppingCart,
} from "lucide-react";
import { DashboardOverview } from "./DashboardOverview";
import { SalesRecords } from "./SalesRecords";
import { UserManagement } from "./UserManagement";
import { JobManagement } from "./JobManagement";
import { PaymentFinance } from "./PaymentFinance";
import { DisputeManagement } from "./DisputeManagement";
import { SLAManagement } from "./SLAManagement";
import { ServiceManagement } from "./ServiceManagement";
import { NotificationsCenter } from "./NotificationsCenter";
import { Button } from "./ui/button";
import { NotificationModal } from "./NotificationModal";
import { Badge } from "./ui/badge";
import { useApi } from "../hooks/useApi";
import { AdminManagement } from "./AdminManagement";
import { SystemSettings } from "./SystemSettings";
import { StoreManagement } from "./StoreManagement";
import { LiveTracking } from "./LiveTracking";
import { useWS } from "../context/WebSocketContext";
import Logo from "../components/figma/public/images/cybersquad black.png";

const menuItems = [
	{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ id: "users", label: "User Management", icon: Users },
	{ id: "jobs", label: "Job Management", icon: Briefcase },
	{ id: "payments", label: "Payment", icon: CreditCard },
	{ id: "disputes", label: "Dispute Management", icon: AlertTriangle },
	{ id: "sla", label: "SLA Management", icon: Clock },
	{ id: "services", label: "Service Management", icon: Wrench },
	{ id: "sales", label: "Sales", icon: ShoppingCart },
	{ id: "tracking", label: "Live Tracking", icon: MapPin },
	{
		id: "admin",
		label: "Admin Management",
		icon: Users,
		requiresSuperUser: true,
	},
	{
		id: "stores",
		label: "Store Management",
		icon: Store,
		requiresSuperUser: true,
	},
	{ id: "notifications", label: "Notifications", icon: Bell },
	{
		id: "settings",
		label: "Settings",
		icon: Settings,
		requiresSuperUser: true,
	},
];

export function DashboardLayout({ onLogout }) {
	const { api } = useApi();
	const { isConnected, unreadCount, updateUnreadCount } = useWS();

	const [activeView, setActiveView] = useState("dashboard");
	const [showNotifications, setShowNotifications] = useState(false);
	const [isSuperUser, setIsSuperUser] = useState(false);
	const [userRole, setUserRole] = useState(null);
	// Filters carried from a Dashboard card click into Job Management / Sales,
	// so the destination page opens already scoped to what was clicked.
	const [jobsInitialFilter, setJobsInitialFilter] = useState(null);
	const [salesInitialFilter, setSalesInitialFilter] = useState(null);

	// Fetch user role and privileges on mount
	useEffect(() => {
		const fetchUserRole = async () => {
			try {
				const res = await api.get("/users/profile/admin/roles-privileges/");
				const data = res?.data?.result;

				// Check if user is superuser
				const isSuperAdmin =
					data?.is_superuser ||
					data?.roles?.some((role) => role.name === "Super Admin");

				setIsSuperUser(isSuperAdmin);
				setUserRole(data);

				console.log("User role data:", data);
				console.log("Is super admin:", isSuperAdmin);
			} catch (e) {
				console.error("Error fetching user role:", e);
			}
		};

		fetchUserRole();
	}, []);

	// Fetch initial unread count on mount (only once, then WebSocket keeps it updated)
	useEffect(() => {
		const fetchUnreadCount = async () => {
			try {
				const res = await api.get("/notifications/notifications/unread_count/");
				const count = res?.data?.result?.unread_count || 0;
				updateUnreadCount(count);
				console.log("Initial unread count:", count);
			} catch (e) {
				console.error("Error fetching unread count:", e);
			}
		};

		fetchUnreadCount();
	}, [api, updateUnreadCount]);

	// Filter menu items based on user role
	const filteredMenuItems = menuItems.filter((item) => {
		if (item.requiresSuperUser) {
			return isSuperUser;
		}
		return true;
	});

	const renderContent = () => {
		switch (activeView) {
			case "dashboard":
				return (
					<DashboardOverview
						onViewSales={(filter) => {
							setSalesInitialFilter(filter ?? null);
							setActiveView("sales");
						}}
						onViewSLA={() => setActiveView("sla")}
						onViewJobs={(filter) => {
							setJobsInitialFilter(filter ?? null);
							setActiveView("jobs");
						}}
					/>
				);
			case "users":
				return <UserManagement />;
			case "jobs":
				return <JobManagement initialFilter={jobsInitialFilter} />;
			case "payments":
				return <PaymentFinance />;
			case "disputes":
				return <DisputeManagement userRole={userRole} />;
			case "sla":
				return <SLAManagement />;
			case "services":
				return <ServiceManagement />;
			case "sales":
				return <SalesRecords initialFilter={salesInitialFilter} />;
			case "tracking":
				return <LiveTracking />;
			case "admin":
				return <AdminManagement />;
			case "stores":
				return <StoreManagement />;
			case "notifications":
				return <NotificationsCenter />;
			case "settings":
				return <SystemSettings />;
			default:
				return <DashboardOverview />;
		}
	};

	return (
		<SidebarProvider>
			<div className="flex min-h-screen w-full">
				<Sidebar>
					<SidebarHeader className="border-b border-sidebar-border p-4">
						<div className="flex items-center gap-2">
							<div className="flex flex-col">
								{/* Fixed height, auto width — a fixed-width box squeezed this logo since it didn't match the PNG's aspect ratio. */}
								<img src={Logo} alt="Cybersquad" className="h-9 w-auto" />
								<span className="text-sm mt-1 text-muted-foreground">
									Admin Panel
								</span>
							</div>
						</div>
					</SidebarHeader>
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Main Menu</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{filteredMenuItems.map((item) => (
										<SidebarMenuItem key={item.id}>
											<SidebarMenuButton
												onClick={() => setActiveView(item.id)}
												isActive={activeView === item.id}
											>
												<item.icon className="w-4 h-4" />
												<span>{item.label}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
						<SidebarGroup className="mt-auto">
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton onClick={onLogout}>
											<LogOut className="w-4 h-4" />
											<span>Logout</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
				</Sidebar>
				<main className="flex-1 overflow-auto">
					<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
						<div className="flex h-14 items-center px-4 gap-4">
							<SidebarTrigger />
							<div className="flex-1" />

							{/* WebSocket connection indicator */}
							{isConnected && (
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
									<span>Live</span>
								</div>
							)}

							<Button
								variant="ghost"
								size="icon"
								className="relative"
								onClick={() => setShowNotifications(true)}
							>
								<Bell className="w-4 h-4" />
								{unreadCount > 0 && (
									<Badge
										variant="destructive"
										className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
									>
										{unreadCount > 99 ? "99+" : unreadCount}
									</Badge>
								)}
							</Button>
						</div>
					</div>
					<div className="p-6">{renderContent()}</div>
				</main>
			</div>
			<NotificationModal
				open={showNotifications}
				onOpenChange={setShowNotifications}
				onUnreadCountChange={updateUnreadCount}
			/>
		</SidebarProvider>
	);
}
