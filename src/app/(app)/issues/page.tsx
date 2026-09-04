"use client";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/components/app-shell/filters";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  issueCode: string;
  priority: string;
  category: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
};

const columns: Column<Row>[] = [
  {
    key: "issueCode",
    header: "Issue",
    render: (r) => (
      <div>
        <div className="font-medium">{r.category}</div>
        <div className="text-xs text-muted-foreground">{r.issueCode}</div>
      </div>
    ),
  },
  { key: "description", header: "Description", render: (r) => <span className="text-sm">{r.description}</span> },
  { key: "priority", header: "Priority", sortable: true, render: (r) => <StatusBadge status={r.priority} /> },
  { key: "dueDate", header: "Due", sortable: true, render: (r) => formatDate(r.dueDate) },
  { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
];

export default function IssuesPage() {
  const { districtId } = useFilters();
  const [status, setStatus] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  return (
    <div>
      <PageHeader
        title="Issues & Snags"
        description="Field-reported issues blocking construction progress"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Issues" }]}
      />
      <DataTable<Row>
        endpoint="/api/issues"
        queryKey={["issues", districtId, status, priority]}
        columns={columns}
        extraParams={{
          districtId: districtId ?? "",
          status: status === "all" ? "" : status,
          priority: priority === "all" ? "" : priority,
        }}
        searchPlaceholder="Search issue code, category, description…"
        exportName="issues"
        toolbar={
          <>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
