"use client";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { useFilters } from "@/components/app-shell/filters";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  date: string;
  stageKey: string | null;
  todaysWork: string | null;
  pctToday: number;
  cumulativePct: number;
  labourCount: number;
  weatherImpact: string | null;
  houseCode: string | null;
};

const columns: Column<Row>[] = [
  { key: "date", header: "Date", sortable: true, render: (r) => formatDate(r.date) },
  { key: "houseCode", header: "House", render: (r) => r.houseCode || "—" },
  { key: "stageKey", header: "Stage", render: (r) => r.stageKey || "—" },
  { key: "todaysWork", header: "Today's Work", render: (r) => <span className="text-sm">{r.todaysWork}</span> },
  { key: "pctToday", header: "% Today", className: "text-right", render: (r) => <span className="tabular-nums">{r.pctToday}%</span> },
  { key: "cumulativePct", header: "Cumulative", className: "text-right", render: (r) => <span className="tabular-nums">{r.cumulativePct.toFixed(0)}%</span> },
  { key: "labourCount", header: "Labour", className: "text-right", render: (r) => <span className="tabular-nums">{r.labourCount}</span> },
  { key: "weatherImpact", header: "Weather", render: (r) => r.weatherImpact || "—" },
];

export default function DailyProgressPage() {
  const { districtId } = useFilters();
  return (
    <div>
      <PageHeader
        title="Daily Progress Reports"
        description="Site engineer / project manager daily construction updates"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Daily Progress" }]}
      />
      <DataTable<Row>
        endpoint="/api/daily-progress"
        queryKey={["dpr", districtId]}
        columns={columns}
        extraParams={{ districtId: districtId ?? "" }}
        searchPlaceholder="Search…"
        exportName="daily-progress"
      />
    </div>
  );
}
