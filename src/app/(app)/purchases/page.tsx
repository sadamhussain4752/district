"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackageCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatINR, formatINRCompact, formatNumber } from "@/lib/utils";

type Option = { id: string; name: string; unit?: string };
type Purchase = { id: string; poNo: string; poDate: string; supplierName: string; warehouseName: string; itemSummary: string; total: number; status: string; grnNo: string | null };
type Data = { rows: Purchase[]; suppliers: Option[]; warehouses: Option[]; materials: Option[]; summary: { orders: number; orderedAmount: number; pending: number; received: number } };

async function post(url: string, body?: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useQuery<Data>({ queryKey: ["purchases"], queryFn: async () => { const response = await fetch("/api/purchases"); if (!response.ok) throw new Error("Failed to load purchases"); return response.json(); } });
  const receive = useMutation({
    mutationFn: (id: string) => post(`/api/purchases/${id}/receive`),
    onSuccess: () => { toast.success("GRN created and inventory stock updated"); qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <div className="space-y-5">
    <PageHeader title="Purchases & GRN" description="Create purchase orders and receive supplier deliveries directly into inventory" breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Purchases & GRN" }]} actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Purchase</Button>} />
    {isLoading || !data ? <Skeleton className="h-24 w-full" /> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="Purchase Orders" value={formatNumber(data.summary.orders)} />
      <KpiCard label="Ordered Amount" value={formatINRCompact(data.summary.orderedAmount)} tone="navy" />
      <KpiCard label="Awaiting Receipt" value={formatNumber(data.summary.pending)} tone="warning" />
      <KpiCard label="Received" value={formatNumber(data.summary.received)} tone="success" />
    </div>}
    <Card><CardContent className="pt-5"><Table><TableHeader><TableRow><TableHead>PO / Date</TableHead><TableHead>Supplier</TableHead><TableHead>Inventory Location</TableHead><TableHead>Products</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
      {(data?.rows ?? []).map((row) => <TableRow key={row.id}><TableCell><div className="font-medium">{row.poNo}</div><div className="text-xs text-muted-foreground">{formatDate(row.poDate)}</div></TableCell><TableCell>{row.supplierName}</TableCell><TableCell>{row.warehouseName}</TableCell><TableCell className="max-w-xs">{row.itemSummary}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatINR(row.total)}</TableCell><TableCell><StatusBadge status={row.status} />{row.grnNo && <div className="mt-1 text-xs text-muted-foreground">{row.grnNo}</div>}</TableCell><TableCell className="text-right">{row.status === "RECEIVED" ? <span className="text-xs text-muted-foreground">In inventory</span> : <Button size="sm" variant="outline" disabled={receive.isPending} onClick={() => receive.mutate(row.id)}>{receive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Receive</Button>}</TableCell></TableRow>)}
      {!isLoading && !data?.rows.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No purchase orders yet. Create one, then receive it to add stock.</TableCell></TableRow>}
    </TableBody></Table></CardContent></Card>
    <PurchaseDialog open={open} onClose={() => setOpen(false)} data={data} />
  </div>;
}

const EMPTY = { supplierId: "new", supplierName: "", warehouseId: "", materialId: "", productName: "", category: "", unit: "Nos", quantity: "", rate: "", invoiceNo: "", vehicleNo: "" };

function PurchaseDialog({ open, onClose, data }: { open: boolean; onClose: () => void; data?: Data }) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState(EMPTY);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const isNewProduct = form.materialId === "new";
  const mutation = useMutation({
    mutationFn: () => post("/api/purchases", {
      supplierId: form.supplierId !== "new" ? form.supplierId : undefined, supplierName: form.supplierId === "new" ? form.supplierName : undefined,
      warehouseId: form.warehouseId, materialId: form.materialId && !isNewProduct ? form.materialId : undefined,
      newMaterial: isNewProduct ? { name: form.productName, category: form.category, unit: form.unit } : undefined,
      quantity: Number(form.quantity), rate: Number(form.rate), invoiceNo: form.invoiceNo, vehicleNo: form.vehicleNo,
    }),
    onSuccess: () => { toast.success("Purchase order created"); qc.invalidateQueries({ queryKey: ["purchases"] }); onClose(); setForm(EMPTY); },
    onError: (error: Error) => toast.error(error.message),
  });
  const amount = Number(form.quantity || 0) * Number(form.rate || 0);
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>New Purchase Order</DialogTitle><DialogDescription>Stock is added only after you click Receive and the GRN is created.</DialogDescription></DialogHeader><form id="purchase-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
    <Field label="Supplier"><Select value={form.supplierId} onValueChange={set("supplierId")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">+ New supplier</SelectItem>{data?.suppliers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
    {form.supplierId === "new" && <Field label="New supplier name"><Input required value={form.supplierName} onChange={(e) => set("supplierName")(e.target.value)} /></Field>}
    <Field label="Inventory location"><Select value={form.warehouseId} onValueChange={set("warehouseId")}><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger><SelectContent>{data?.warehouses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
    <Field label="Product"><Select value={form.materialId} onValueChange={set("materialId")}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent><SelectItem value="new">+ Add new product</SelectItem>{data?.materials.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit})</SelectItem>)}</SelectContent></Select></Field>
    {isNewProduct && <><Field label="Product name"><Input required value={form.productName} onChange={(e) => set("productName")(e.target.value)} /></Field><Field label="Category"><Input required value={form.category} onChange={(e) => set("category")(e.target.value)} /></Field><Field label="Unit"><Input required placeholder="Nos, Bags, Cu.m, MT…" value={form.unit} onChange={(e) => set("unit")(e.target.value)} /></Field></>}
    <Field label="Quantity"><Input required type="number" min="0.001" step="any" value={form.quantity} onChange={(e) => set("quantity")(e.target.value)} /></Field>
    <Field label="Rate"><Input required type="number" min="0" step="any" value={form.rate} onChange={(e) => set("rate")(e.target.value)} /></Field>
    <Field label="Supplier invoice"><Input value={form.invoiceNo} onChange={(e) => set("invoiceNo")(e.target.value)} /></Field>
    <Field label="Vehicle number"><Input value={form.vehicleNo} onChange={(e) => set("vehicleNo")(e.target.value)} /></Field>
    <div className="rounded-lg border bg-muted/40 p-3 sm:col-span-2"><div className="text-xs text-muted-foreground">Purchase amount</div><div className="text-lg font-semibold">{formatINR(amount)}</div></div>
  </form><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="purchase-form" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Purchase</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
