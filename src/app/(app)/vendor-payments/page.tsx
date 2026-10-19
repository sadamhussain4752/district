"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFilters } from "@/components/app-shell/filters";
import { formatDate, formatINR, formatINRCompact, formatNumber } from "@/lib/utils";

type VendorPayment = {
  id: string;
  expenseCode: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  vendor: string | null;
  paymentMode: string | null;
  reference: string | null;
  remarks: string | null;
  districtName: string | null;
  mandalName: string | null;
  status: string;
};

type Summary = {
  total: { amount: number; count: number };
  topCategories: { category: string; amount: number; count: number }[];
  categories: string[];
  labourGroups: {
    vendor: string;
    amount: number;
    count: number;
    transactions: VendorPayment[];
  }[];
};

const columns: Column<VendorPayment>[] = [
  {
    key: "date",
    header: "Date",
    sortable: true,
    render: (row) => <div><div className="whitespace-nowrap">{formatDate(row.date)}</div><div className="text-xs text-muted-foreground">{row.expenseCode}</div></div>,
  },
  { key: "vendor", header: "Vendor", render: (row) => <span className="font-medium">{row.vendor || "—"}</span> },
  { key: "category", header: "Purpose", sortable: true, render: (row) => row.category },
  {
    key: "description",
    header: "Description",
    render: (row) => <div className="max-w-xs"><div className="truncate" title={row.description ?? ""}>{row.description || "—"}</div>{row.remarks && <div className="truncate text-xs text-muted-foreground" title={row.remarks}>{row.remarks}</div>}</div>,
  },
  {
    key: "location",
    header: "Location",
    render: (row) => row.districtName ? <div><div>{row.districtName}</div>{row.mandalName && <div className="text-xs text-muted-foreground">{row.mandalName}</div>}</div> : "—",
  },
  { key: "reference", header: "Chq / Ref No.", render: (row) => row.reference || "—" },
  { key: "paymentMode", header: "Mode", render: (row) => row.paymentMode || "—" },
  { key: "amount", header: "Amount", sortable: true, className: "text-right", render: (row) => <span className="font-medium tabular-nums">{formatINR(row.amount)}</span> },
  { key: "status", header: "Status", sortable: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function VendorPaymentsPage() {
  const { districtId } = useFilters();
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const params = {
    source: "vendor",
    districtId: districtId ?? "",
    category: category === "all" ? "" : category,
    status: status === "all" ? "" : status,
  };
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ["vendor-payments-summary", query],
    queryFn: () => fetch(`/api/expenses/summary?${query}`).then((response) => {
      if (!response.ok) throw new Error("Failed to load vendor payment summary");
      return response.json();
    }),
  });
  const count = summary?.total.count ?? 0;
  const average = count ? (summary?.total.amount ?? 0) / count : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Payments"
        description="Payments imported from PAYMENTS SUMMARY — vendor, purpose, reference and location details"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Vendor Payments" }]}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard loading={isLoading} label="Total Paid" value={formatINRCompact(summary?.total.amount)} tone="navy" />
        <KpiCard loading={isLoading} label="Payments" value={formatNumber(count)} />
        <KpiCard loading={isLoading} label="Average Payment" value={formatINRCompact(average)} tone="warning" />
        <KpiCard loading={isLoading} label="Top Purpose" value={summary?.topCategories[0] ? formatINRCompact(summary.topCategories[0].amount) : "—"} sub={summary?.topCategories[0]?.category ?? "—"} tone="success" />
      </div>
      {(summary?.labourGroups?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Labour Contractor Groups</CardTitle>
            <p className="text-sm text-muted-foreground">
              {(summary?.labourGroups ?? []).length} contractors · {formatNumber((summary?.labourGroups ?? []).reduce((sum, group) => sum + group.count, 0))} transactions · {formatINRCompact((summary?.labourGroups ?? []).reduce((sum, group) => sum + group.amount, 0))}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(summary?.labourGroups ?? []).map((group) => (
              <details key={group.vendor.toLocaleLowerCase("en-IN")} className="group rounded-lg border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40">
                  <div>
                    <div className="font-medium">{group.vendor}</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(group.count)} transaction{group.count === 1 ? "" : "s"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{formatINR(group.amount)}</div>
                    <div className="text-xs text-primary">More information</div>
                  </div>
                </summary>
                <div className="overflow-x-auto border-t">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date</TableHead><TableHead>Payment ID</TableHead><TableHead>Location</TableHead>
                      <TableHead>Reference</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {group.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.expenseCode}</TableCell>
                          <TableCell>{transaction.mandalName ?? transaction.districtName ?? "—"}</TableCell>
                          <TableCell>{transaction.reference ?? "—"}</TableCell>
                          <TableCell>{transaction.paymentMode ?? "—"}</TableCell>
                          <TableCell><StatusBadge status={transaction.status} /></TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatINR(transaction.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      )}
      <DataTable<VendorPayment>
        endpoint="/api/expenses"
        queryKey={["vendor-payments", query]}
        columns={columns}
        extraParams={params}
        searchPlaceholder="Search vendor, purpose or reference…"
        exportName="vendor-payments"
        defaultSort="date"
        defaultDir="desc"
        toolbar={<>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Purpose" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All purposes</SelectItem>{(summary?.categories ?? []).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="PAID">Paid</SelectItem><SelectItem value="SUBMITTED">Submitted</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem></SelectContent>
          </Select>
        </>}
      />
    </div>
  );
}
