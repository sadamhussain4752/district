"use client";
import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/misc";
import { useFilters } from "@/components/app-shell/filters";
import { formatINR } from "@/lib/utils";
import { CONSTRUCTION_STAGES } from "@/lib/constants";

type Row = {
  id: string;
  beneficiaryCode: string;
  applicationNo: string;
  applicationId: string | null;
  astCode: string | null;
  name: string;
  mobile: string | null;
  status: string;
  sft: string | null;
  mouStatus: string | null;
  cmsAccountStatus: string | null;
  cardHolderName: string | null;
  onlineStatus: string | null;
  district: { name: string } | null;
  mandal: { name: string } | null;
  village: { name: string } | null;
  house: {
    id: string;
    houseCode: string;
    progressPct: number;
    status: string;
    currentStageName: string | null;
    actualCost: number;
    estimatedCost: number;
  } | null;
};

function onlineVariant(s: string | null) {
  if (!s) return "muted" as const;
  if (/done/i.test(s)) return "success" as const;
  if (/pending|not done/i.test(s)) return "warning" as const;
  return "default" as const;
}

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Beneficiary",
    sortable: true,
    render: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-xs text-muted-foreground">
          {r.astCode ?? r.beneficiaryCode} · {r.applicationId ?? r.applicationNo}
        </div>
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    render: (r) => (
      <div className="text-sm">
        {r.village?.name || "—"}
        <div className="text-xs text-muted-foreground">
          {r.mandal?.name}, {r.district?.name}
        </div>
      </div>
    ),
  },
  {
    key: "cardHolderName",
    header: "Card Holder",
    render: (r) => r.cardHolderName || "—",
    defaultHidden: true,
  },
  { key: "mobile", header: "Mobile", render: (r) => r.mobile || "—", defaultHidden: true },
  {
    key: "stage",
    header: "Current Stage",
    render: (r) =>
      r.house ? (
        <span className="text-sm">{r.house.currentStageName || "—"}</span>
      ) : (
        <span className="text-xs text-muted-foreground">No house</span>
      ),
  },
  {
    key: "house",
    header: "Progress",
    render: (r) =>
      r.house ? (
        <div className="flex w-32 items-center gap-2">
          <Progress value={r.house.progressPct} className="h-1.5" />
          <span className="w-9 text-right text-xs tabular-nums">
            {r.house.progressPct.toFixed(0)}%
          </span>
        </div>
      ) : (
        "—"
      ),
  },
  {
    key: "received",
    header: "Received / Bill",
    className: "text-right",
    render: (r) =>
      r.house ? (
        <span className="text-xs tabular-nums">
          {formatINR(r.house.actualCost)}
          <span className="text-muted-foreground">
            {" "}
            / {formatINR(r.house.estimatedCost)}
          </span>
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "onlineStatus",
    header: "Approval",
    render: (r) =>
      r.onlineStatus ? (
        <Badge variant={onlineVariant(r.onlineStatus)} className="max-w-[170px] truncate">
          {r.onlineStatus}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "cmsAccountStatus",
    header: "Card",
    render: (r) =>
      r.cmsAccountStatus ? <StatusBadge status={r.cmsAccountStatus} /> : "—",
    defaultHidden: true,
  },
  {
    key: "mouStatus",
    header: "MOU",
    render: (r) => r.mouStatus || "—",
    defaultHidden: true,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (r) => <StatusBadge status={r.status} />,
  },
];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "started", label: "Started" },
  { value: "under_construction", label: "Under Construction" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On Hold" },
];

export default function BeneficiariesPage() {
  const { districtId, fy } = useFilters();
  const [status, setStatus] = React.useState("all");
  const [stage, setStage] = React.useState("all");

  return (
    <div>
      <PageHeader
        title="Beneficiaries"
        description="Indiramma Indlu beneficiary files — stage progress, approvals and payments"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Beneficiaries" }]}
        actions={
          <Button asChild size="sm">
            <Link href="/beneficiaries/new">
              <Plus className="h-4 w-4" /> New Beneficiary
            </Link>
          </Button>
        }
      />
      <DataTable<Row>
        endpoint="/api/beneficiaries"
        queryKey={["beneficiaries", districtId, fy, status, stage]}
        columns={columns}
        extraParams={{
          districtId: districtId ?? "",
          fy,
          status: status === "all" ? "" : status,
          stage: stage === "all" ? "" : stage,
        }}
        rowHref={(r) => `/beneficiaries/${r.id}`}
        searchPlaceholder="Search name, AST code, application ID, mobile…"
        exportName="beneficiaries"
        toolbar={
          <>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {CONSTRUCTION_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
