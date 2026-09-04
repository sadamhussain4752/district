"use client";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/misc";
import { useFilters } from "@/components/app-shell/filters";
import { formatINRCompact } from "@/lib/utils";

type Row = {
  id: string;
  code: string;
  name: string;
  districtName: string;
  financialYear: string;
  plannedHouses: number;
  houseCount: number;
  completedHouses: number;
  approvedBudget: number;
  progressPct: number;
  status: string;
};

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Project",
    sortable: true,
    render: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-xs text-muted-foreground">{r.code} · {r.districtName}</div>
      </div>
    ),
  },
  { key: "financialYear", header: "FY", render: (r) => r.financialYear },
  {
    key: "houses",
    header: "Houses",
    render: (r) => (
      <span className="tabular-nums">
        {r.completedHouses}/{r.houseCount || r.plannedHouses}
      </span>
    ),
  },
  {
    key: "approvedBudget",
    header: "Budget",
    sortable: true,
    className: "text-right",
    render: (r) => <span className="tabular-nums">{formatINRCompact(r.approvedBudget)}</span>,
  },
  {
    key: "progressPct",
    header: "Progress",
    sortable: true,
    render: (r) => (
      <div className="flex w-36 items-center gap-2">
        <Progress value={r.progressPct} className="h-1.5" />
        <span className="w-9 text-right text-xs tabular-nums">{r.progressPct.toFixed(0)}%</span>
      </div>
    ),
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function ProjectsPage() {
  const { districtId, fy } = useFilters();
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Housing project / cluster master"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Projects" }]}
      />
      <DataTable<Row>
        endpoint="/api/projects"
        queryKey={["projects", districtId, fy]}
        columns={columns}
        extraParams={{ districtId: districtId ?? "", fy }}
        rowHref={(r) => `/projects/${r.id}`}
        searchPlaceholder="Search project name or code…"
        exportName="projects"
      />
    </div>
  );
}
