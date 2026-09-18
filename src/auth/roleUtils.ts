export const ROLE_LANDING_PATHS = {
  admin: "/admin",
  front_desk: "/dashboard",
  engineer: "/engineer",
  qa: "/qa",
  inventory_manager: "/inventory",
  sales: "/pos",
} as const;

export type AppRole = keyof typeof ROLE_LANDING_PATHS;

function normalizeRoleCandidate(candidate: unknown): AppRole | null {
  if (typeof candidate !== "string") {
    return null;
  }

  const normalized = candidate.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized === "front_desk" ||
    normalized === "front desk" ||
    normalized === "front desk manager" ||
    normalized === "front_desk_manager"
  ) {
    return "front_desk";
  }

  if (normalized === "engineer" || normalized === "technician") {
    return "engineer";
  }

  if (
    normalized === "qa" ||
    normalized === "qa manager" ||
    normalized === "quality assurance" ||
    normalized === "quality_assurance"
  ) {
    return "qa";
  }

  if (normalized === "inventory_manager" || normalized === "inventory manager") {
    return "inventory_manager";
  }

  if (normalized === "admin" || normalized.includes("admin")) {
    return "admin";
  }

  if (normalized.includes("sales") || normalized.includes("cashier")) {
    return "sales";
  }

  return null;
}

export function resolveAppRoleFromAuthPayload(payload: any): AppRole | null {
  const rolesArr = Array.isArray(payload?.roles) ? payload.roles : [];
  const adminRolesArr = Array.isArray(payload?.admin_roles) ? payload.admin_roles : [];
  const roleCandidates = [
    ...rolesArr.map((role) => role?.name),
    ...adminRolesArr,
    payload?.user?.role,
    payload?.role,
  ];

  for (const candidate of roleCandidates) {
    const resolvedRole = normalizeRoleCandidate(candidate);

    if (resolvedRole) {
      return resolvedRole;
    }
  }

  if (payload?.user?.is_superuser || payload?.user?.is_staff) {
    return "admin";
  }

  return null;
}

export function getLandingPath(role: AppRole | null | undefined, fallbackPath = "/"): string {
  if (!role) {
    return fallbackPath;
  }

  return ROLE_LANDING_PATHS[role] || fallbackPath;
}
