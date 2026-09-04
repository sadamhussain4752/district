"use client";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Row = {
  id: string;
  userName: string | null;
  role: string | null;
  action: string;
  module: string;
  recordId: string | null;
  reason: string | null;
  ip: string | null;
  createdAt: string;
};

const columns: Column<Row>[] = [
  { key: "createdAt", header: "Timestamp", sortable: true, render: (r) => <span className="text-xs tabular-nums">{formatDateTime(r.createdAt)}</span> },
  {
    key: "userName",
    header: "User",
    render: (r) => (
      <div>
        <div className="font-medium">{r.userName || "System"}</div>
        <div className="text-xs text-muted-foreground">{r.role}</div>
      </div>
    ),
  },
  { key: "action", header: "Action", render: (r) => <Badge variant="outline">{r.action}</Badge> },
  { key: "module", header: "Module", render: (r) => r.module },
  { key: "recordId", header: "Record", render: (r) => <span className="text-xs">{r.recordId || "—"}</span>, defaultHidden: true },
  { key: "reason", header: "Reason / Note", render: (r) => <span className="text-sm text-muted-foreground">{r.reason || "—"}</span> },
  { key: "ip", header: "IP", render: (r) => <span className="text-xs">{r.ip || "—"}</span>, defaultHidden: true },
];

export default function AuditPage() {
  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of every critical action — create, update, approve, payment, stock and stage changes"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Audit Logs" }]}
      />
      <DataTable<Row>
        endpoint="/api/audit"
        queryKey={["audit"]}
        columns={columns}
        searchPlaceholder="Search module or user…"
        exportName="audit-log"
      />
    </div>
  );
}
