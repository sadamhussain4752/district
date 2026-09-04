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

/** Construction stage master — seeded into ConstructionStage. */
export const CONSTRUCTION_STAGES: {
  key: string;
  name: string;
  mandatory: boolean;
  qc: boolean;
  milestone?: "FOUNDATION" | "PLINTH" | "ROOF" | "COMPLETION";
  weight: number;
}[] = [
  { key: "APPROVED", name: "Beneficiary Approved", mandatory: true, qc: false, weight: 1 },
  { key: "SITE_VERIFICATION", name: "Site Verification", mandatory: true, qc: false, weight: 2 },
  { key: "SITE_HANDOVER", name: "Site Handover", mandatory: true, qc: false, weight: 2 },
  { key: "LAYOUT", name: "Layout / Marking", mandatory: true, qc: false, weight: 2 },
  { key: "EXCAVATION", name: "Excavation", mandatory: true, qc: false, weight: 4 },
  { key: "FOUNDATION", name: "Foundation", mandatory: true, qc: true, milestone: "FOUNDATION", weight: 8 },
  { key: "PLINTH", name: "Plinth", mandatory: true, qc: true, milestone: "PLINTH", weight: 7 },
  { key: "RCC", name: "Column / RCC Work", mandatory: true, qc: true, weight: 8 },
  { key: "WALLS", name: "Wall Construction", mandatory: true, qc: false, weight: 8 },
  { key: "LINTEL", name: "Lintel", mandatory: true, qc: false, weight: 4 },
  { key: "ROOF", name: "Roof / Slab", mandatory: true, qc: true, milestone: "ROOF", weight: 9 },
  { key: "ELEC_ROUGH", name: "Electrical Rough-in", mandatory: true, qc: false, weight: 3 },
  { key: "PLUMB_ROUGH", name: "Plumbing Rough-in", mandatory: true, qc: false, weight: 3 },
  { key: "INT_PLASTER", name: "Internal Plastering", mandatory: true, qc: false, weight: 4 },
  { key: "EXT_PLASTER", name: "External Plastering", mandatory: true, qc: false, weight: 4 },
  { key: "FLOORING", name: "Flooring", mandatory: true, qc: false, weight: 4 },
  { key: "DOORS_WINDOWS", name: "Doors & Windows", mandatory: true, qc: false, weight: 4 },
  { key: "ELEC_FINISH", name: "Electrical Finishing", mandatory: true, qc: false, weight: 2 },
  { key: "PLUMB_FINISH", name: "Plumbing Finishing", mandatory: true, qc: false, weight: 2 },
  { key: "PAINTING", name: "Painting", mandatory: true, qc: false, weight: 3 },
  { key: "FINAL_FINISH", name: "Final Finishing", mandatory: true, qc: false, weight: 2 },
  { key: "QUALITY_INSPECTION", name: "Quality Inspection", mandatory: true, qc: true, weight: 1 },
  { key: "BENEFICIARY_INSPECTION", name: "Beneficiary Inspection", mandatory: true, qc: false, weight: 1 },
  { key: "COMPLETION", name: "Completion", mandatory: true, qc: false, milestone: "COMPLETION", weight: 1 },
  { key: "HANDOVER", name: "Handover", mandatory: true, qc: false, weight: 1 },
];

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
