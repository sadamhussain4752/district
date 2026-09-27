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
    { key: "name", header: "Labour vendor", sortable: true, render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.vendorCode}</div></div> }, { key: "contactPhone", header: "Contact", render: (r) => r.contactPhone || "—" },
    { key: "trade", header: "Trade", render: (r) => r.trade || "—" }, { key: "workerCount", header: "Workers", sortable: true, className: "text-right", render: (r) => <span className="tabular-nums">{r.workerCount ?? 0}</span> }, { key: "supervisorName", header: "Works under supervisor", render: (r) => r.supervisorName || "—" }, { key: "rateType", header: "Rate type", render: (r) => r.rateType?.replaceAll("_", " ") || "—" },
    { key: "location", header: "Location", render: (r) => [r.districtName, r.mandalName].filter(Boolean).join(" / ") || "—" }, { key: "projectName", header: "Project", render: (r) => r.projectName || "—" },
    { key: "actions", header: "", exportable: false, className: "w-24 text-right", render: (r) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button></div> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Labour Contractors"
        description="Labour contractor master, supervisor assignments, attendance and quantity claims"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Labour Contractors" }]}
      />
      <DataTable endpoint="/api/labour" queryKey={["labour"]} columns={columns} defaultSort="name" defaultDir="asc" searchPlaceholder="Search vendor, code or trade…" exportName="labour-vendors" toolbar={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add labour vendor</Button>} />
      <ResourceFormDialog kind="labour" open={adding || !!editing} record={editing} onClose={() => { setAdding(false); setEditing(null); }} />
      <ResourceDeleteDialog kind="labour" record={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
