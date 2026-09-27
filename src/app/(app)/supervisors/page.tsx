"use client";
import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ResourceDeleteDialog, ResourceFormDialog, type ResourceRow } from "@/components/resource-master-dialog";

export default function Page() {
  const [editing, setEditing] = React.useState<ResourceRow | null>(null); const [deleting, setDeleting] = React.useState<ResourceRow | null>(null); const [adding, setAdding] = React.useState(false);
  const columns: Column<ResourceRow>[] = [
    { key: "name", header: "Supervisor", sortable: true, render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.supervisorCode}</div></div> },
    { key: "mobile", header: "Contact", render: (r) => r.mobile || "—" }, { key: "contractorName", header: "Contractor", render: (r) => r.contractorName || "—" },
    { key: "location", header: "Location", render: (r) => [r.districtName, r.mandalName].filter(Boolean).join(" / ") || "—" }, { key: "projectName", header: "Project", render: (r) => r.projectName || "—" },
    { key: "activeSites", header: "Active sites", sortable: true, className: "text-right", render: (r) => <span className="tabular-nums">{r.activeSites ?? 0}</span> },
    { key: "actions", header: "", exportable: false, className: "w-24 text-right", render: (r) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button></div> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Supervisors"
        description="Supervisor master — assigned sites, tasks and site-visit tracking"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Supervisors" }]}
      />
      <DataTable endpoint="/api/supervisors" queryKey={["supervisors"]} columns={columns} defaultSort="name" defaultDir="asc" searchPlaceholder="Search name, code or mobile…" exportName="supervisors" toolbar={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add supervisor</Button>} />
      <ResourceFormDialog kind="supervisor" open={adding || !!editing} record={editing} onClose={() => { setAdding(false); setEditing(null); }} />
      <ResourceDeleteDialog kind="supervisor" record={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
