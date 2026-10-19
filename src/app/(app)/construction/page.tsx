"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/misc";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/components/app-shell/filters";
import {
  CONSTRUCTION_STAGES, STAGE_STATUS_GROUP_LABELS, type StageStatusGroup,
} from "@/lib/constants";
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
  beneficiary: {
    name: string;
    beneficiaryCode: string;
    applicationId: string | null;
    applicationNo: string;
  } | null;
  district: { name: string } | null;
  mandal: { name: string } | null;
  labourVendor: { name: string; vendorCode: string } | null;
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
        <div className="text-xs tabular-nums text-muted-foreground">
          Application ID: {r.beneficiary?.applicationId ?? r.beneficiary?.applicationNo ?? "—"}
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
  { key: "labourVendor", header: "Labour Contractor", render: (r) => r.labourVendor ? <div><div className="text-sm"><Link href="/labour" className="text-primary hover:underline">{r.labourVendor.name}</Link></div><div className="text-xs text-muted-foreground">{r.labourVendor.vendorCode}</div></div> : "—" },
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
  // useSearchParams needs a Suspense boundary for the prerender pass.
  return (
    <React.Suspense fallback={null}>
      <ConstructionList />
    </React.Suspense>
  );
}

function ConstructionList() {
  const { districtId } = useFilters();
  const sp = useSearchParams();
  const [health, setHealth] = React.useState(sp.get("health") ?? "all");
  const [status, setStatus] = React.useState(sp.get("status") ?? "all");
  // Arrived from the dashboard's stage tiles: /construction?stage=BL&stageStatus=done
  const [stage, setStage] = React.useState(sp.get("stage") ?? "all");
  const [stageStatus, setStageStatus] = React.useState(sp.get("stageStatus") ?? "all");
  const [labourVendorId, setLabourVendorId] = React.useState(sp.get("labourVendorId") ?? "all");
  // Arrived from the Contractors / Supervisors masters — keep the scope, show it as a chip.
  const [contractorId, setContractorId] = React.useState(sp.get("contractorId") ?? "");
  const [supervisorId, setSupervisorId] = React.useState(sp.get("supervisorId") ?? "");

  const { data: vendors } = useQuery<{ data: { id: string; name: string; vendorCode: string }[] }>({
    queryKey: ["labour-filter-options"],
    queryFn: () => fetch("/api/labour?pageSize=200&sort=name&dir=asc").then((r) => r.json()),
  });

  return (
    <div>
      <PageHeader
        title="Construction Monitoring"
        description="Every beneficiary house as an individual construction unit"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Construction" }]}
      />

      {(contractorId || supervisorId) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Scoped to</span>
          {contractorId && (
            <button
              className="rounded-full border px-2.5 py-1 hover:bg-accent"
              onClick={() => setContractorId("")}
            >
              one contractor ✕
            </button>
          )}
          {supervisorId && (
            <button
              className="rounded-full border px-2.5 py-1 hover:bg-accent"
              onClick={() => setSupervisorId("")}
            >
              one supervisor ✕
            </button>
          )}
        </div>
      )}
      <DataTable<Row>
        endpoint="/api/houses"
        queryKey={["houses", districtId, health, status, stage, stageStatus, labourVendorId, contractorId, supervisorId]}
        columns={columns}
        extraParams={{
          districtId: districtId ?? "",
          health: health === "all" ? "" : health,
          status: status === "all" ? "" : status,
          stage: stage === "all" ? "" : stage,
          stageStatus: stage === "all" || stageStatus === "all" ? "" : stageStatus,
          labourVendorId: labourVendorId === "all" ? "" : labourVendorId,
          contractorId,
          supervisorId,
        }}
        rowHref={(r) => `/construction/${r.id}`}
        searchPlaceholder="Search house, beneficiary or Application ID…"
        exportName="houses"
        toolbar={
          <>
            <Select value={labourVendorId} onValueChange={setLabourVendorId}>
              <SelectTrigger className="h-9 w-52">
                <SelectValue placeholder="Labour contractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All labour contractors</SelectItem>
                {(vendors?.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {CONSTRUCTION_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageStatus} onValueChange={setStageStatus} disabled={stage === "all"}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Stage status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any stage status</SelectItem>
                {(Object.keys(STAGE_STATUS_GROUP_LABELS) as StageStatusGroup[]).map((g) => (
                  <SelectItem key={g} value={g}>
                    {STAGE_STATUS_GROUP_LABELS[g]}{g === "done" ? " ✅" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
