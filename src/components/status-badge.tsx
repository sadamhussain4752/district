import { Badge } from "@/components/ui/badge";
import {
  BENEFICIARY_STATUS_LABELS,
  HOUSE_STATUS_LABELS,
  STAGE_STATUS_LABELS,
} from "@/lib/constants";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

const MAP: Record<string, Variant> = {
  // beneficiary
  APPLIED: "muted",
  VERIFICATION_PENDING: "warning",
  VERIFIED: "default",
  REJECTED: "destructive",
  APPROVED: "default",
  HOUSE_ALLOTTED: "default",
  CONSTRUCTION_NOT_STARTED: "muted",
  CONSTRUCTION_STARTED: "default",
  UNDER_CONSTRUCTION: "default",
  COMPLETED: "success",
  ON_HOLD: "warning",
  CANCELLED: "destructive",
  // house
  NOT_STARTED: "muted",
  IN_PROGRESS: "default",
  DELAYED: "destructive",
  HANDED_OVER: "success",
  // stage
  STARTED: "default",
  PENDING_VERIFICATION: "warning",
  REWORK_REQUIRED: "destructive",
  // schedule health
  ON_SCHEDULE: "success",
  AT_RISK: "warning",
  CRITICAL: "destructive",
  // approval
  PENDING: "warning",
  // quality
  PASSED: "success",
  PASSED_WITH_OBSERVATION: "warning",
  FAILED: "destructive",
  // health band
  HEALTHY: "success",
  ATTENTION: "warning",
  // generic
  ACTIVE: "success",
  DISABLED: "muted",
  PAID: "success",
  DRAFT: "muted",
  SUBMITTED: "default",
};

const LABELS: Record<string, string> = {
  ...BENEFICIARY_STATUS_LABELS,
  ...HOUSE_STATUS_LABELS,
  ...STAGE_STATUS_LABELS,
  ON_SCHEDULE: "On Schedule",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
  HEALTHY: "Healthy",
  ATTENTION: "Attention Required",
  PASSED_WITH_OBSERVATION: "Passed w/ Observation",
  REWORK_REQUIRED: "Rework Required",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const variant = MAP[status] ?? "secondary";
  const label =
    LABELS[status] ??
    status
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
