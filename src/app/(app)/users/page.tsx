"use client";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type Row = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  department: string | null;
  status: string;
  districtName: string | null;
  lastLoginAt: string | null;
};

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "User",
    sortable: true,
    render: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-xs text-muted-foreground">{r.employeeId} · {r.email}</div>
      </div>
    ),
  },
  { key: "role", header: "Role", sortable: true, render: (r) => <Badge variant="secondary">{ROLE_LABELS[r.role as keyof typeof ROLE_LABELS] ?? r.role}</Badge> },
  { key: "districtName", header: "District", render: (r) => r.districtName || "—" },
  { key: "mobile", header: "Mobile", render: (r) => r.mobile || "—", defaultHidden: true },
  { key: "lastLoginAt", header: "Last Login", sortable: true, render: (r) => r.lastLoginAt ? formatDateTime(r.lastLoginAt) : "Never" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function UsersPage() {
  const [role, setRole] = React.useState("all");
  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="System users, role assignments and geographic access"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Users & Roles" }]}
      />
      <DataTable<Row>
        endpoint="/api/users"
        queryKey={["users", role]}
        columns={columns}
        extraParams={{ role: role === "all" ? "" : role }}
        searchPlaceholder="Search name, employee ID, email…"
        exportName="users"
        toolbar={
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
