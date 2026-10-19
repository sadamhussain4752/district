"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceDeleteDialog, ResourceFormDialog, type ResourceRow } from "@/components/resource-master-dialog";
import { LabourPaymentChart } from "./payment-chart";
import { formatINR, formatINRCompact, formatNumber } from "@/lib/utils";

type MandalClaim = {
  id: string; mandalName: string;
  augerCount: number; blCount: number; rlCount: number; rcCount: number; compCount: number;
};
type Row = ResourceRow & {
  augerCount: number; blCount: number; rlCount: number; rcCount: number; compCount: number;
  houseCount: number; claimAmount: number; tdsAmount: number; netPayable: number;
  paidAmount: number; balanceAmount: number; mandalClaims: MandalClaim[];
};

const n = (v: number) => <span className="tabular-nums">{formatNumber(v ?? 0)}</span>;

export default function Page() {
  // useSearchParams needs a Suspense boundary for the prerender pass.
  return (
    <React.Suspense fallback={null}>
      <LabourPage />
    </React.Suspense>
  );
}

function LabourPage() {
  const supervisorId = useSearchParams().get("supervisorId") ?? "";
  const scope = supervisorId ? `?supervisorId=${supervisorId}` : "";
  const [editing, setEditing] = React.useState<ResourceRow | null>(null);
  const [deleting, setDeleting] = React.useState<ResourceRow | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [claims, setClaims] = React.useState<Row | null>(null);

  const { data: totals } = useQuery<any>({
    queryKey: ["labour-totals", supervisorId],
    queryFn: () => fetch(`/api/labour?pageSize=1&supervisorId=${supervisorId}`).then((r) => r.json()).then((d) => d.totals),
  });

  const nameColumn: Column<Row> = {
    key: "name", header: "Labour contractor", sortable: true,
    render: (r) => (
      <div>
        <Link
          href={`/construction?labourVendorId=${r.id}`}
          className="font-medium text-primary hover:underline"
          title={`Houses worked by ${r.name}`}
        >
          {r.name}
        </Link>
        <div className="text-xs text-muted-foreground">{r.vendorCode}</div>
      </div>
    ),
  };
  const actionsColumn: Column<Row> = {
    key: "actions", header: "", exportable: false, className: "w-24 text-right",
    render: (r) => (
      <div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  };

  // Tab 1 — the Labour_Payment Details chart.
  const paymentColumns: Column<Row>[] = [
    nameColumn,
    {
      key: "houseCount", header: "Houses", className: "text-right",
      render: (r) => (
        <button className="tabular-nums text-primary hover:underline" onClick={() => setClaims(r)}>
          {formatNumber(r.houseCount ?? 0)}
        </button>
      ),
    },
    { key: "augerCount", header: "Auger", className: "text-right", render: (r) => n(r.augerCount) },
    { key: "blCount", header: "BL", className: "text-right", render: (r) => n(r.blCount) },
    { key: "rlCount", header: "RL", className: "text-right", render: (r) => n(r.rlCount) },
    { key: "rcCount", header: "RC", className: "text-right", render: (r) => n(r.rcCount) },
    { key: "compCount", header: "COMP", className: "text-right", render: (r) => n(r.compCount), defaultHidden: true },
    {
      key: "claimAmount", header: "Gross", className: "text-right",
      render: (r) => <span className="tabular-nums">{formatINR(r.claimAmount)}</span>, defaultHidden: true,
    },
    {
      key: "tdsAmount", header: "TDS 1%", className: "text-right",
      render: (r) => <span className="tabular-nums">{formatINR(r.tdsAmount)}</span>, defaultHidden: true,
    },
    {
      key: "netPayable", header: "Net payable", sortable: true, className: "text-right",
      render: (r) => <span className="tabular-nums font-medium">{formatINR(r.netPayable)}</span>,
    },
    {
      key: "paidAmount", header: "Paid", sortable: true, className: "text-right",
      render: (r) => <span className="tabular-nums">{formatINR(r.paidAmount)}</span>,
    },
    {
      key: "balanceAmount", header: "Balance", sortable: true, className: "text-right",
      render: (r) => (
        <span className={`tabular-nums ${r.balanceAmount > 0 ? "text-destructive" : ""}`}>
          {formatINR(r.balanceAmount)}
        </span>
      ),
    },
    { key: "supervisorName", header: "Supervisor", render: (r) => r.supervisorName || "—", defaultHidden: true },
    { key: "location", header: "Location", render: (r) => [r.districtName, r.mandalName].filter(Boolean).join(" / ") || "—", defaultHidden: true },
    actionsColumn,
  ];

  // Tab 2 — the contractor master, as it was before the payment chart.
  const masterColumns: Column<Row>[] = [
    nameColumn,
    { key: "contactPhone", header: "Contact", render: (r) => r.contactPhone || "—" },
    { key: "trade", header: "Trade", render: (r) => r.trade || "—" },
    {
      key: "workerCount", header: "Workers", sortable: true, className: "text-right",
      render: (r) => <span className="tabular-nums">{r.workerCount ?? 0}</span>,
    },
    { key: "supervisorName", header: "Works under supervisor", render: (r) => r.supervisorName || "—" },
    { key: "rateType", header: "Rate type", render: (r) => r.rateType?.replaceAll("_", " ") || "—" },
    {
      key: "location", header: "Location",
      render: (r) => [r.districtName, r.mandalName].filter(Boolean).join(" / ") || "—",
    },
    { key: "projectName", header: "Project", render: (r) => r.projectName || "—" },
    actionsColumn,
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Labour Contractors"
        description="Labour payment chart — houses done per stage, net payable and balance"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Labour Contractors" }]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Stage Claims" tone="navy"
          value={formatNumber(
            (totals?.augerCount ?? 0) + (totals?.blCount ?? 0) + (totals?.rlCount ?? 0) +
            (totals?.rcCount ?? 0) + (totals?.compCount ?? 0),
          )}
          sub={`Stages claimed, not houses · Auger ${formatNumber(totals?.augerCount ?? 0)} · BL ${formatNumber(totals?.blCount ?? 0)} · RL ${formatNumber(totals?.rlCount ?? 0)} · RC ${formatNumber(totals?.rcCount ?? 0)} · COMP ${formatNumber(totals?.compCount ?? 0)}`}
        />
        <KpiCard label="Net Payable" value={formatINRCompact(totals?.netPayable)}
          sub={`Gross ${formatINRCompact(totals?.claimAmount)} · TDS ${formatINRCompact(totals?.tdsAmount)}`} />
        <KpiCard label="Paid" tone="success" value={formatINRCompact(totals?.paidAmount)} />
        <KpiCard label="Balance" tone="destructive" value={formatINRCompact(totals?.balanceAmount)} />
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Payment Chart</TabsTrigger>
          <TabsTrigger value="payments">Summary</TabsTrigger>
          <TabsTrigger value="master">Contractor Master</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <LabourPaymentChart />
        </TabsContent>

        <TabsContent value="payments">
          <DataTable<Row>
            endpoint="/api/labour"
            queryKey={["labour-payments", supervisorId]}
            extraParams={{ supervisorId }}
            columns={paymentColumns}
            defaultSort="netPayable"
            defaultDir="desc"
            searchPlaceholder="Search contractor or code…"
            exportName="labour-payment-chart"
            toolbar={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add labour contractor</Button>}
          />
        </TabsContent>

        <TabsContent value="master">
          <DataTable<Row>
            endpoint="/api/labour"
            queryKey={["labour-master", supervisorId]}
            extraParams={{ supervisorId }}
            columns={masterColumns}
            defaultSort="name"
            defaultDir="asc"
            searchPlaceholder="Search contractor, code or trade…"
            exportName="labour-contractors"
            toolbar={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add labour contractor</Button>}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!claims} onOpenChange={(o) => !o && setClaims(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{claims?.name} — mandal-wise houses</DialogTitle>
            <DialogDescription>
              From the Labour_Payment Details sheet · {formatNumber(claims?.houseCount ?? 0)} houses ·
              net payable {formatINR(claims?.netPayable ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mandal</TableHead>
                <TableHead className="text-right">Auger</TableHead>
                <TableHead className="text-right">BL</TableHead>
                <TableHead className="text-right">RL</TableHead>
                <TableHead className="text-right">RC</TableHead>
                <TableHead className="text-right">COMP</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(claims?.mandalClaims ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.mandalName}</TableCell>
                  <TableCell className="text-right">{n(c.augerCount)}</TableCell>
                  <TableCell className="text-right">{n(c.blCount)}</TableCell>
                  <TableCell className="text-right">{n(c.rlCount)}</TableCell>
                  <TableCell className="text-right">{n(c.rcCount)}</TableCell>
                  <TableCell className="text-right">{n(c.compCount)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {n(c.augerCount + c.blCount + c.rlCount + c.rcCount + c.compCount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <ResourceFormDialog kind="labour" open={adding || !!editing} record={editing} onClose={() => { setAdding(false); setEditing(null); }} />
      <ResourceDeleteDialog kind="labour" record={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
