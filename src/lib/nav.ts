import type { FeatureKey } from "./rbac";

export type NavItem = {
  label: string;
  href: string;
  icon: string; // lucide icon name
  feature: FeatureKey;
  group: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", feature: "dashboard", group: "Overview" },
  { label: "Command Center", href: "/command-center", icon: "Radar", feature: "command-center", group: "Overview" },
  { label: "Executive MIS", href: "/executive-mis", icon: "FileBarChart", feature: "executive-mis", group: "Overview" },
  { label: "Map Overview", href: "/map", icon: "Map", feature: "map", group: "Overview" },

  { label: "Beneficiaries", href: "/beneficiaries", icon: "Users", feature: "beneficiaries", group: "Field Operations" },
  { label: "Projects", href: "/projects", icon: "FolderKanban", feature: "projects", group: "Field Operations" },
  { label: "Construction", href: "/construction", icon: "Building2", feature: "construction", group: "Field Operations" },
  { label: "Daily Progress", href: "/daily-progress", icon: "ClipboardList", feature: "daily-progress", group: "Field Operations" },

  { label: "Contractors", href: "/contractors", icon: "HardHat", feature: "contractors", group: "Resources" },
  { label: "Supervisors", href: "/supervisors", icon: "UserCog", feature: "supervisors", group: "Resources" },
  { label: "Labour", href: "/labour", icon: "Hammer", feature: "labour", group: "Resources" },

  { label: "Inventory", href: "/inventory", icon: "Package", feature: "inventory", group: "Materials" },
  { label: "Material Requests", href: "/material-requests", icon: "PackagePlus", feature: "material-requests", group: "Materials" },
  { label: "Purchases", href: "/purchases", icon: "ShoppingCart", feature: "purchases", group: "Materials" },

  { label: "Expenses", href: "/expenses", icon: "Receipt", feature: "expenses", group: "Finance" },
  { label: "Government Funds", href: "/funds", icon: "Landmark", feature: "funds", group: "Finance" },
  { label: "Payments", href: "/payments", icon: "IndianRupee", feature: "payments", group: "Finance" },

  { label: "Quality", href: "/quality", icon: "BadgeCheck", feature: "quality", group: "Governance" },
  { label: "Issues", href: "/issues", icon: "TriangleAlert", feature: "issues", group: "Governance" },
  { label: "Approvals", href: "/approvals", icon: "CheckCheck", feature: "approvals", group: "Governance" },
  { label: "Reports", href: "/reports", icon: "FileSpreadsheet", feature: "reports", group: "Governance" },
  { label: "Documents", href: "/documents", icon: "FolderArchive", feature: "documents", group: "Governance" },

  { label: "Users & Roles", href: "/users", icon: "ShieldCheck", feature: "users", group: "Administration" },
  { label: "Audit Logs", href: "/audit", icon: "ScrollText", feature: "audit", group: "Administration" },
  { label: "Settings", href: "/settings", icon: "Settings", feature: "settings", group: "Administration" },
];

export const NAV_GROUPS = [
  "Overview",
  "Field Operations",
  "Resources",
  "Materials",
  "Finance",
  "Governance",
  "Administration",
];
