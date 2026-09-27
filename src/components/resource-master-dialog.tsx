"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ResourceKind = "supervisor" | "labour";
export type ResourceRow = {
  id: string; name: string; mobile?: string | null; contactPhone?: string | null;
  contractorId?: string | null; districtId?: string | null; mandalId?: string | null; projectId?: string | null; supervisorId?: string | null;
  trade?: string | null; workerCount?: number; rateType?: string | null;
  supervisorCode?: string; vendorCode?: string; activeSites?: number; entryCount?: number;
  contractorName?: string | null; districtName?: string | null; mandalName?: string | null; projectName?: string | null; supervisorName?: string | null;
};
type Option = { id: string; name: string };
const NONE = "__none";

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Request failed");
  return response.json();
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function optionData(data: unknown): Option[] { return Array.isArray(data) ? data as Option[] : ((data as { data?: Option[] })?.data ?? []); }

export function ResourceFormDialog({ kind, open, record, onClose }: { kind: ResourceKind; open: boolean; record: ResourceRow | null; onClose: () => void }) {
  const qc = useQueryClient(); const isLabour = kind === "labour"; const endpoint = isLabour ? "/api/labour" : "/api/supervisors";
  const [form, setForm] = React.useState<Record<string, string>>({});
  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  React.useEffect(() => { if (!open) return; setForm({ name: record?.name ?? "", mobile: record?.mobile ?? "", contactPhone: record?.contactPhone ?? "", trade: record?.trade ?? "", workerCount: String(record?.workerCount ?? 0), rateType: record?.rateType ?? "DAILY", contractorId: record?.contractorId ?? "", districtId: record?.districtId ?? "", mandalId: record?.mandalId ?? "", projectId: record?.projectId ?? "", supervisorId: record?.supervisorId ?? "" }); }, [open, record]);
  const { data: districtsRaw = [] } = useQuery({ queryKey: ["district-options"], queryFn: () => request("/api/locations/districts", "GET"), enabled: open });
  const { data: mandalsRaw = [] } = useQuery({ queryKey: ["mandal-options", form.districtId], queryFn: () => request(`/api/locations/mandals?districtId=${form.districtId}`, "GET"), enabled: open && !!form.districtId });
  const { data: contractorsRaw = { data: [] } } = useQuery({ queryKey: ["contractor-options"], queryFn: () => request("/api/contractors?pageSize=100&sort=companyName&dir=asc", "GET"), enabled: open });
  const { data: projectsRaw = { data: [] } } = useQuery({ queryKey: ["project-options", form.districtId], queryFn: () => request(`/api/projects?pageSize=100&sort=name&dir=asc${form.districtId ? `&districtId=${form.districtId}` : ""}`, "GET"), enabled: open });
  const { data: supervisorsRaw = { data: [] } } = useQuery({ queryKey: ["supervisor-options", form.districtId, form.contractorId], queryFn: () => request(`/api/supervisors?pageSize=100&sort=name&dir=asc${form.districtId ? `&districtId=${form.districtId}` : ""}${form.contractorId ? `&contractorId=${form.contractorId}` : ""}`, "GET"), enabled: open && isLabour });
  const districts = optionData(districtsRaw); const mandals = optionData(mandalsRaw);
  const contractors = ((contractorsRaw as { data?: Array<{ id: string; companyName: string }> }).data ?? []).map((x) => ({ id: x.id, name: x.companyName })); const projects = optionData(projectsRaw); const supervisors = optionData(supervisorsRaw);
  const mutation = useMutation({ mutationFn: () => request(record ? `${endpoint}/${record.id}` : endpoint, record ? "PATCH" : "POST", { ...form, workerCount: Number(form.workerCount || 0) }), onSuccess: () => { toast.success(`${isLabour ? "Labour vendor" : "Supervisor"} ${record ? "updated" : "created"}`); qc.invalidateQueries({ queryKey: [isLabour ? "labour" : "supervisors"] }); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  const select = (label: string, key: string, options: Option[], disabled = false) => <Field label={label}><Select value={form[key] || NONE} disabled={disabled} onValueChange={(v) => set(key)(v === NONE ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{options.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></Field>;
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{record ? "Edit" : "Add"} {isLabour ? "labour contractor" : "supervisor"}</DialogTitle><DialogDescription>Codes are generated automatically. Location and assignment options come from current master data.</DialogDescription></DialogHeader><form id={`${kind}-form`} className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><Field label={isLabour ? "Labour contractor name" : "Supervisor name"}><Input required minLength={2} value={form.name ?? ""} onChange={(e) => set("name")(e.target.value)} /></Field><Field label="Contact number"><Input value={(isLabour ? form.contactPhone : form.mobile) ?? ""} onChange={(e) => set(isLabour ? "contactPhone" : "mobile")(e.target.value)} /></Field>{isLabour && <><Field label="Trade"><Input placeholder="e.g. Masonry" value={form.trade ?? ""} onChange={(e) => set("trade")(e.target.value)} /></Field><Field label="Worker count"><Input type="number" min="0" required value={form.workerCount ?? "0"} onChange={(e) => set("workerCount")(e.target.value)} /></Field><Field label="Rate type"><Select value={form.rateType || "DAILY"} onValueChange={set("rateType")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DAILY">Daily</SelectItem><SelectItem value="CONTRACT">Contract</SelectItem><SelectItem value="QUANTITY">Quantity</SelectItem></SelectContent></Select></Field></>}{select("Contractor", "contractorId", contractors)}{select("District", "districtId", districts)}<Field label="Mandal"><Select value={form.mandalId || NONE} disabled={!form.districtId} onValueChange={(v) => set("mandalId")(v === NONE ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{mandals.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></Field>{select("Project", "projectId", projects)}{isLabour && select("Works under supervisor", "supervisorId", supervisors)}</form><DialogFooter><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" form={`${kind}-form`} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{record ? "Save changes" : "Create"}</Button></DialogFooter></DialogContent></Dialog>;
}

export function ResourceDeleteDialog({ kind, record, onClose }: { kind: ResourceKind; record: ResourceRow | null; onClose: () => void }) {
  const qc = useQueryClient(); const label = kind === "labour" ? "labour vendor" : "supervisor"; const mutation = useMutation({ mutationFn: () => request(`/api/${kind === "labour" ? "labour" : "supervisors"}/${record!.id}`, "DELETE"), onSuccess: () => { toast.success(`${label} deleted`); qc.invalidateQueries({ queryKey: [kind === "labour" ? "labour" : "supervisors"] }); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  return <Dialog open={!!record} onOpenChange={(value) => !value && onClose()}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete {record?.name}?</DialogTitle><DialogDescription>This permanently removes the {label}. Records with site assignments or attendance entries cannot be deleted.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Delete</Button></DialogFooter></DialogContent></Dialog>;
}
