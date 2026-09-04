import type { Role } from "@prisma/client";
import type { SessionUser } from "./auth";

/**
 * Navigation + feature areas. A role either has access to an area or not.
 * Fine-grained record scoping (district/project) is applied on top via scopeFilter().
 */
export type FeatureKey =
  | "dashboard"
  | "command-center"
  | "executive-mis"
  | "map"
  | "beneficiaries"
  | "projects"
  | "construction"
  | "daily-progress"
  | "contractors"
  | "supervisors"
  | "labour"
  | "inventory"
  | "material-requests"
  | "purchases"
  | "expenses"
  | "funds"
  | "payments"
  | "quality"
  | "issues"
  | "approvals"
  | "reports"
  | "documents"
  | "users"
  | "audit"
  | "settings";

const ALL: FeatureKey[] = [
  "dashboard", "command-center", "executive-mis", "map", "beneficiaries",
  "projects", "construction", "daily-progress", "contractors", "supervisors",
  "labour", "inventory", "material-requests", "purchases", "expenses", "funds",
  "payments", "quality", "issues", "approvals", "reports", "documents", "users",
  "audit", "settings",
];

const ROLE_FEATURES: Record<Role, FeatureKey[]> = {
  SUPER_ADMIN: ALL,
  STATE_ADMIN: ALL.filter((f) => !["users", "settings"].includes(f)),
  DISTRICT_MANAGER: [
    "dashboard", "command-center", "executive-mis", "map", "beneficiaries",
    "projects", "construction", "daily-progress", "contractors", "supervisors",
    "labour", "inventory", "material-requests", "purchases", "expenses", "funds",
    "payments", "quality", "issues", "approvals", "reports", "documents",
  ],
  PROJECT_MANAGER: [
    "dashboard", "map", "beneficiaries", "projects", "construction",
    "daily-progress", "contractors", "supervisors", "labour", "inventory",
    "material-requests", "expenses", "payments", "quality", "issues",
    "approvals", "reports", "documents",
  ],
  SITE_ENGINEER: [
    "dashboard", "construction", "daily-progress", "labour", "material-requests",
    "quality", "issues", "documents",
  ],
  CONTRACTOR: [
    "dashboard", "construction", "daily-progress", "material-requests",
    "payments", "issues", "documents",
  ],
  LABOUR_VENDOR: ["dashboard", "labour", "issues"],
  STORE_MANAGER: [
    "dashboard", "inventory", "material-requests", "purchases", "reports",
  ],
  ACCOUNTS: [
    "dashboard", "executive-mis", "expenses", "funds", "payments",
    "contractors", "reports", "approvals", "documents",
  ],
  AUDITOR: [
    "dashboard", "command-center", "executive-mis", "map", "beneficiaries",
    "projects", "construction", "reports", "documents", "audit",
  ],
};

export function canAccess(role: Role, feature: FeatureKey): boolean {
  return ROLE_FEATURES[role]?.includes(feature) ?? false;
}

export function allowedFeatures(role: Role): Set<FeatureKey> {
  return new Set(ROLE_FEATURES[role] ?? []);
}

export const WRITE_ROLES: Role[] = [
  "SUPER_ADMIN", "STATE_ADMIN", "DISTRICT_MANAGER", "PROJECT_MANAGER",
  "SITE_ENGINEER", "STORE_MANAGER", "ACCOUNTS", "CONTRACTOR", "LABOUR_VENDOR",
];

export function isReadOnly(role: Role) {
  return role === "AUDITOR";
}

/** Whether a role may view unmasked Aadhaar / bank details. */
export function canViewSensitive(user: SessionUser) {
  return (
    ["SUPER_ADMIN", "STATE_ADMIN", "ACCOUNTS"].includes(user.role) ||
    user.permissions.includes("sensitive:view")
  );
}

/**
 * Prisma `where` fragment restricting records to the user's geography.
 * Applied to any model exposing districtId / projectId (adjust `keys`).
 */
export function scopeFilter(
  user: SessionUser,
  keys: { district?: string; project?: string } = { district: "districtId" },
): Record<string, unknown> {
  if (["SUPER_ADMIN", "STATE_ADMIN", "AUDITOR", "ACCOUNTS"].includes(user.role)) {
    return {};
  }
  const or: Record<string, unknown>[] = [];
  if (user.districtId && keys.district) {
    or.push({ [keys.district]: user.districtId });
  }
  if (user.projectIds.length && keys.project) {
    or.push({ [keys.project]: { in: user.projectIds } });
  }
  if (!or.length) return {};
  return or.length === 1 ? or[0] : { OR: or };
}
