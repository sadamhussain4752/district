"use client";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/misc";
import { formatINRCompact } from "@/lib/utils";

type Row = {
  id: string;
  contractorCode: string;
  companyName: string;
  ownerName: string | null;
  gstin: string | null;
  contactPhone: string | null;
  contractValue: number;
  performanceScore: number;
  qualityScore: number;
  status: string;
  assignedHouses: number;
  completedHouses: number;
  billedAmount: number;
};

const columns: Column<Row>[] = [
  {
    key: "companyName",
    header: "Contractor",
    sortable: true,
    render: (r) => (
      <div>
        <div className="font-medium">{r.companyName}</div>
        <div className="text-xs text-muted-foreground">
          {r.contractorCode} · {r.ownerName}
        </div>
      </div>
    ),
  },
  { key: "gstin", header: "GSTIN", render: (r) => r.gstin || "—", defaultHidden: true },
  { key: "contactPhone", header: "Contact", render: (r) => r.contactPhone || "—" },
  {
    key: "houses",
    header: "Houses (done/total)",
    render: (r) => (
      <span className="tabular-nums">
        {r.completedHouses}/{r.assignedHouses}
      </span>
    ),
  },
  {
    key: "contractValue",
    header: "Contract Value",
    sortable: true,
    className: "text-right",
    render: (r) => <span className="tabular-nums">{formatINRCompact(r.contractValue)}</span>,
  },
  {
    key: "billedAmount",
    header: "Billed",
    className: "text-right",
    render: (r) => <span className="tabular-nums">{formatINRCompact(r.billedAmount)}</span>,
  },
  {
    key: "performanceScore",
    header: "Performance",
    sortable: true,
    render: (r) => (
      <div className="flex w-28 items-center gap-2">
        <Progress value={r.performanceScore} className="h-1.5" />
        <span className="w-8 text-right text-xs tabular-nums">{r.performanceScore.toFixed(0)}</span>
      </div>
    ),
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function ContractorsPage() {
  return (
    <div>
      <PageHeader
        title="Contractors & Builders"
        description="Contractor master — assignments, performance and billing"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Contractors" }]}
      />
      <DataTable<Row>
        endpoint="/api/contractors"
        queryKey={["contractors"]}
        columns={columns}
        searchPlaceholder="Search company, code or GSTIN…"
        exportName="contractors"
      />
    </div>
  );
}
