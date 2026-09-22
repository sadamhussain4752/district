import type { Role } from "@prisma/client";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || "Indiramma Illu Management System";
export const CLIENT_NAME = "EESHA INFRA GLOBAL PRIVATE LIMITED";
export const DEPLOY_STATE = (process.env.NEXT_PUBLIC_DEPLOY_STATE || "TG") as
  | "TG"
  | "AP";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  STATE_ADMIN: "State Admin",
  DISTRICT_MANAGER: "District Manager",
  PROJECT_MANAGER: "Project Manager",
  SITE_ENGINEER: "Site Engineer / Supervisor",
  CONTRACTOR: "Builder / Contractor",
  LABOUR_VENDOR: "Labour Vendor",
  STORE_MANAGER: "Store / Inventory Manager",
  ACCOUNTS: "Accounts / Finance",
  AUDITOR: "Auditor / Viewer",
};

export const FINANCIAL_YEARS = [
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
];
export const CURRENT_FY = "2025-26";

/**
 * Construction stage master — the real Indiramma Indlu / Astonic workflow.
 * Auger Filing → BL (basement/plinth level) → RL (roof level / walls+lintel) →
 * RC (roof casting / slab) → Completion. Bill values total ₹5,00,000 per house.
 */
export const CONSTRUCTION_STAGES: {
  key: string;
  name: string;
  shortName: string;
  mandatory: boolean;
  qc: boolean;
  milestone?: "FOUNDATION" | "PLINTH" | "ROOF" | "COMPLETION";
  weight: number;
  billValue: number;
}[] = [
  { key: "AUGER", name: "Auger Filing", shortName: "Auger Filing", mandatory: true, qc: false, weight: 10, billValue: 0 },
  { key: "BL", name: "Basement Level (BL)", shortName: "BL", mandatory: true, qc: true, milestone: "FOUNDATION", weight: 22, billValue: 100000 },
  { key: "RL", name: "Roof Level (RL)", shortName: "RL", mandatory: true, qc: false, weight: 22, billValue: 100000 },
  { key: "RC", name: "Roof Casting (RC)", shortName: "RC", mandatory: true, qc: true, milestone: "ROOF", weight: 26, billValue: 140000 },
  { key: "COMP", name: "Completion", shortName: "COMP", mandatory: true, qc: false, milestone: "COMPLETION", weight: 20, billValue: 160000 },
];

/** Full contract value of one Indiramma Indlu house (sum of stage bill values). */
export const HOUSE_CONTRACT_VALUE = CONSTRUCTION_STAGES.reduce(
  (a, s) => a + s.billValue,
  0,
); // ₹5,00,000

/** Stage code as it appears in the source workbook -> our stage key. */
export const STAGE_ALIASES: Record<string, string> = {
  AUGER: "AUGER",
  BL: "BL",
  LL: "BL", // "lower level" seen occasionally in dashboards = basement level
  RL: "RL",
  RC: "RC",
  COMP: "COMP",
  "F-COMP": "COMP",
};

/** Government approval chain a stage bill passes through before payment. */
export const APPROVAL_CHAIN = [
  { key: "PS", label: "Panchayat Secretary" },
  { key: "AE", label: "Assistant Engineer" },
  { key: "PD", label: "Project Director" },
  { key: "Collector", label: "District Collector" },
  { key: "EE", label: "Executive Engineer" },
  { key: "CE", label: "Chief Engineer" },
  { key: "MD", label: "Managing Director (TSHCL)" },
] as const;

export const PAYMENT_MODES = [
  "ICICI Card",
  "Golden Rock Card",
  "Eesha Card",
  "DBT / Own Account",
  "Cash Collected",
] as const;

/** Payment-milestone enum -> the stage it actually represents in this workflow. */
export const PAYMENT_MILESTONE_LABELS: Record<string, string> = {
  FOUNDATION: "Basement Level (BL)",
  PLINTH: "Roof Level (RL)",
  ROOF: "Roof Casting (RC)",
  COMPLETION: "Completion (COMP)",
};

export const BENEFICIARY_STATUS_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  VERIFICATION_PENDING: "Verification Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  HOUSE_ALLOTTED: "House Allotted",
  CONSTRUCTION_NOT_STARTED: "Not Started",
  CONSTRUCTION_STARTED: "Construction Started",
  UNDER_CONSTRUCTION: "Under Construction",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

export const HOUSE_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  UNDER_CONSTRUCTION: "Under Construction",
  DELAYED: "Delayed",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  HANDED_OVER: "Handed Over",
};

export const STAGE_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  STARTED: "Started",
  IN_PROGRESS: "In Progress",
  PENDING_VERIFICATION: "Pending Verification",
  VERIFIED: "Verified",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  REWORK_REQUIRED: "Rework Required",
};

export const EXPENSE_CATEGORIES = [
  "Construction Material",
  "Labour",
  "Transport",
  "Equipment",
  "Site Expense",
  "Administration",
  "Fuel",
  "Rent",
  "Utilities",
  "Miscellaneous",
];

export const ISSUE_CATEGORIES = [
  "Material shortage",
  "Poor workmanship",
  "Beneficiary issue",
  "Contractor delay",
  "Labour shortage",
  "Payment issue",
  "Site access",
  "Technical problem",
];
