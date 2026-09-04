"use client";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/misc";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/components/app-shell/filters";
import { formatINR } from "@/lib/utils";

type Row = {
  id: string;
  houseCode: string;
  progressPct: number;
  status: string;
  scheduleHealth: string;
  healthScore: number;
  currentStageName: string | null;
  estimatedCost: number;
  actualCost: number;
  beneficiary: { name: string; beneficiaryCode: string } | null;
  district: { name: string } | null;
  mandal: { name: string } | null;
};

const columns: Column<Row>[] = [
  {
    key: "houseCode",
    header: "House",
    sortable: true,
    render: (r) => (
      <div>
        <div className="font-medium">{r.houseCode}</div>
        <div className="text-xs text-muted-foreground">
          {r.beneficiary?.name}
        </div>
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    render: (r) => (
      <span className="text-sm">
        {r.mandal?.name}, {r.district?.name}
      </span>
    ),
  },
  {
    key: "currentStageName",
    header: "Current Stage",
    render: (r) => r.currentStageName || "—",
  },
  {
    key: "progressPct",
    header: "Progress",
    sortable: true,
    render: (r) => (
      <div className="flex w-36 items-center gap-2">
        <Progress value={r.progressPct} className="h-1.5" />
        <span className="w-9 text-right text-xs tabular-nums">
          {r.progressPct.toFixed(0)}%
        </span>
      </div>
    ),
  },
  {
    key: "scheduleHealth",
    header: "Schedule",
    render: (r) => <StatusBadge status={r.scheduleHealth} />,
  },
  {
    key: "healthScore",
    header: "Health",
    sortable: true,
    className: "text-right",
    render: (r) => <span className="tabular-nums">{r.healthScore}</span>,
  },
  {
    key: "actualCost",
    header: "Actual / Est. Cost",
    className: "text-right",
    render: (r) => (
      <span className="text-xs tabular-nums">
        {formatINR(r.actualCost)}
        <span className="text-muted-foreground"> / {formatINR(r.estimatedCost)}</span>
      </span>
    ),
    defaultHidden: true,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

export default function ConstructionPage() {
  const { districtId } = useFilters();
  const [health, setHealth] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  return (
    <div>
      <PageHeader
        title="Construction Monitoring"
        description="Every beneficiary house as an individual construction unit"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Construction" }]}
      />
      <DataTable<Row>
        endpoint="/api/houses"
        queryKey={["houses", districtId, health, status]}
        columns={columns}
        extraParams={{
          districtId: districtId ?? "",
          health: health === "all" ? "" : health,
          status: status === "all" ? "" : status,
        }}
        rowHref={(r) => `/construction/${r.id}`}
        searchPlaceholder="Search house code…"
        exportName="houses"
        toolbar={
          <>
            <Select value={health} onValueChange={setHealth}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schedules</SelectItem>
                <SelectItem value="delayed">Delayed / Critical</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="UNDER_CONSTRUCTION">Under Construction</SelectItem>
                <SelectItem value="DELAYED">Delayed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
