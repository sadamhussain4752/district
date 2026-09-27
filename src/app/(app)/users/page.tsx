"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MANAGED_USER_ROLES, ROLE_LABELS } from "@/lib/constants";
import { allowedFeatures } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import type { Role } from "@prisma/client";

type Row = {
  id: string; employeeId: string; name: string; email: string; mobile: string | null;
  role: string; department: string | null; status: string; districtName: string | null;
  lastLoginAt: string | null; permissions: string[]; effectiveAccess: string[];
};

const FEATURES = [
  ["Overview", [["dashboard", "Dashboard"], ["command-center", "Command Center"], ["executive-mis", "Executive MIS"], ["map", "Map Overview"]]],
  ["Field Operations", [["beneficiaries", "Beneficiaries"], ["projects", "Projects"], ["construction", "Construction"], ["daily-progress", "Daily Progress"]]],
  ["Resources", [["contractors", "Contractors"], ["supervisors", "Supervisors"], ["labour", "Labour"]]],
  ["Materials", [["inventory", "Inventory"], ["material-requests", "Material Requests"], ["purchases", "Purchases & GRN"]]],
  ["Finance", [["expenses", "Expenses"], ["funds", "Government Funds"], ["payments", "Payments"]]],
  ["Governance", [["quality", "Quality"], ["issues", "Issues"], ["approvals", "Approvals"], ["reports", "Reports"], ["documents", "Documents"]]],
  ["Administration", [["users", "Users & Roles"], ["audit", "Audit Logs"], ["settings", "Settings"]]],
] as const;
const MANAGED_ROLE_OPTIONS = MANAGED_USER_ROLES.map((key) => [key, ROLE_LABELS[key]] as const);

export default function UsersPage() {
  const [role, setRole] = React.useState("all");
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const columns = React.useMemo<Column<Row>[]>(() => [
    { key: "name", header: "User", sortable: true, render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.employeeId} · {row.email}</div></div> },
    { key: "role", header: "Role", sortable: true, render: (row) => <Badge variant="secondary">{ROLE_LABELS[row.role as keyof typeof ROLE_LABELS] ?? row.role}</Badge> },
    { key: "access", header: "Module Access", render: (row) => <div><div className="font-medium">{row.effectiveAccess.length} modules</div>{row.permissions.some((item) => item.startsWith("feature:")) && <div className="text-xs text-primary">Custom access</div>}</div> },
    { key: "districtName", header: "District", render: (row) => row.districtName || "All / role scope" },
    { key: "lastLoginAt", header: "Last Login", sortable: true, render: (row) => row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "actions", header: "", exportable: false, className: "text-right", render: (row) => <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(row)}><Pencil className="h-4 w-4" /> Edit</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" /> Delete</Button></div> },
  ], []);
  return <div>
    <PageHeader title="Users & Roles" description="Role defaults, module-level access and account status" breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Users & Roles" }]} />
    <DataTable<Row> endpoint="/api/users" queryKey={["users", role]} columns={columns} extraParams={{ role: role === "all" ? "" : role }} searchPlaceholder="Search name, employee ID, email…" exportName="users" toolbar={<Select value={role} onValueChange={setRole}><SelectTrigger className="h-9 w-48"><SelectValue placeholder="Role" /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{MANAGED_ROLE_OPTIONS.map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select>} />
    <EditDialog user={editing} onClose={() => setEditing(null)} />
    <DeleteDialog user={deleting} onClose={() => setDeleting(null)} />
  </div>;
}

function EditDialog({ user, onClose }: { user: Row | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [role, setRole] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [access, setAccess] = React.useState<Set<string>>(new Set());
  const [sensitiveView, setSensitiveView] = React.useState(false);
  React.useEffect(() => {
    if (!user) return;
    setName(user.name); setEmail(user.email); setMobile(user.mobile ?? ""); setDepartment(user.department ?? "");
    setRole(user.role); setStatus(user.status); setAccess(new Set(user.effectiveAccess)); setSensitiveView(user.permissions.includes("sensitive:view"));
  }, [user]);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${user!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, mobile, department, role, status, access: [...access], sensitiveView }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Failed to update access"); return result;
    },
    onSuccess: () => { toast.success("User and access settings updated · effective on next sign-in"); qc.invalidateQueries({ queryKey: ["users"] }); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const toggle = (feature: string) => setAccess((current) => { const next = new Set(current); if (next.has(feature)) next.delete(feature); else next.add(feature); return next; });
  return <Dialog open={!!user} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Edit user · {user?.employeeId}</DialogTitle><DialogDescription>Update the user profile, account state, role and module-level permissions.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-email">Email</Label><Input id="edit-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-mobile">Mobile</Label><Input id="edit-mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-department">Department</Label><Input id="edit-department" value={department} onChange={(event) => setDepartment(event.target.value)} /></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Role</Label><Select value={role} onValueChange={(value) => { setRole(value); setAccess(allowedFeatures(value as Role)); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MANAGED_ROLE_OPTIONS.map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Account status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="DISABLED">Disabled</SelectItem><SelectItem value="INVITED">Invited</SelectItem></SelectContent></Select></div></div>
    <div className="space-y-3"><div className="flex items-center justify-between"><div><Label>Module access</Label><p className="text-xs text-muted-foreground">{access.size} modules selected</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setAccess(new Set(FEATURES.flatMap(([, items]) => items.map(([key]) => key))))}>Select all</Button><Button type="button" size="sm" variant="ghost" onClick={() => setAccess(new Set())}>Clear</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2">{FEATURES.map(([group, items]) => <fieldset key={group} className="rounded-lg border p-3"><legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</legend><div className="mt-1 grid gap-2">{items.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={access.has(key)} onChange={() => toggle(key)} /><span>{label}</span></label>)}</div></fieldset>)}</div>
    </div>
    <label className="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={sensitiveView} onChange={(event) => setSensitiveView(event.target.checked)} /><span><span className="flex items-center gap-1.5 text-sm font-medium"><KeyRound className="h-4 w-4" /> View sensitive data</span><span className="block text-xs text-muted-foreground">Allows unmasked bank and identity details where supported.</span></span></label>
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending || name.trim().length < 2 || !email.includes("@")} >{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function DeleteDialog({ user, onClose }: { user: Row | null; onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${user!.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete user");
      return result;
    },
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["users"] }); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Dialog open={!!user} onOpenChange={(value) => !value && onClose()}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete {user?.name}?</DialogTitle><DialogDescription>This permanently removes employee ID {user?.employeeId}, revokes their sessions, and cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete user</Button></DialogFooter></DialogContent></Dialog>;
}
