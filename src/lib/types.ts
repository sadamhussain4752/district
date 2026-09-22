import type { Role } from "@prisma/client";
import type { SessionUser } from "./auth";
import type { FeatureKey } from "./rbac";

export type MeResponse = {
  user: SessionUser;
  districtName: string | null;
  features: FeatureKey[];
  unreadNotifications: number;
};

export type Paginated<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type DashboardKpis = {
  totalApplications: number;
  totalBeneficiaries: number;
  verifiedBeneficiaries: number;
  approvedHouses: number;
  constructionStarted: number;
  notStarted: number;
  underConstruction: number;
  completedHouses: number;
  delayedHouses: number;
  cancelledCount: number;
  totalProjectValue: number;
  fundsReceived: number;
  amountReleased: number;
  totalExpenditure: number;
  pendingPayments: number;
  inventoryValue: number;
  lowStockItems: number;
  availableBalance: number;
  overallCompletionPct: number;
};

export type DistrictStat = {
  id: string;
  name: string;
  geoKey: string | null;
  applications: number;
  approved: number;
  started: number;
  underConstruction: number;
  completed: number;
  notStarted: number;
  delayed: number;
  projectValue: number;
  spent: number;
  completionPct: number;
};

export type RoleOption = { value: Role; label: string };

export type ActivityItem = {
  id: string;
  actorName: string;
  actorRole: Role | null;
  verb: string;
  summary: string;
  link: string | null;
  createdAt: string;
};
