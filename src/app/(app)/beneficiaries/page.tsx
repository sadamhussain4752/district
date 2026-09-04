"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/misc";
import { useFilters } from "@/components/app-shell/filters";
import { formatINR } from "@/lib/utils";

type Row = {
  id: string;
  beneficiaryCode: string;
  applicationNo: string;
  name: string;
  guardianName: string | null;
  mobile: string | null;
  status: string;
  sanctionAmount: number;
  district: { name: string } | null;
  mandal: { name: string } | null;
  village: { name: string } | null;
  house: { id: string; houseCode: string; progressPct: number; status: string } | null;
};

const columns: Column<Row>[] = [
  {
    key: "beneficiaryCode",
    header: "Beneficiary",
    sortable: true,
    render: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-xs text-muted-foreground">
          {r.beneficiaryCode} · {r.applicationNo}
        </div>
      </div>
    ),
  },
  {
    key: "guardianName",
    header: "Guardian",
    render: (r) => r.guardianName || "—",
    defaultHidden: true,
  },
  { key: "mobile", header: "Mobile", render: (r) => r.mobile || "—" },
  {
    key: "location",
    header: "Location",
    render: (r) => (
      <div className="text-sm">
        {r.village?.name}
        <div className="text-xs text-muted-foreground">
          {r.mandal?.name}, {r.district?.name}
        </div>
      </div>
    ),
  },
  {
    key: "sanctionAmount",
    header: "Sanction",
    sortable: true,
    className: "text-right",
    render: (r) => (
      <span className="tabular-nums">{formatINR(r.sanctionAmount)}</span>
    ),
  },
  {
    key: "house",
    header: "House Progress",
    render: (r) =>
      r.house ? (
        <div className="flex w-32 items-center gap-2">
          <Progress value={r.house.progressPct} className="h-1.5" />
          <span className="w-9 text-right text-xs tabular-nums">
            {r.house.progressPct.toFixed(0)}%
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No house</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (r) => <StatusBadge status={r.status} />,
  },
];

export default function BeneficiariesPage() {
  const { districtId, fy } = useFilters();

  return (
    <div>
      <PageHeader
        title="Beneficiaries"
        description="Housing beneficiary database — applications, verification and house tracking"
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
        queryKey={["beneficiaries", districtId, fy]}
        columns={columns}
        extraParams={{ districtId: districtId ?? "", fy }}
        rowHref={(r) => `/beneficiaries/${r.id}`}
        searchPlaceholder="Search name, code, application no, mobile…"
        exportName="beneficiaries"
      />
    </div>
  );
}
