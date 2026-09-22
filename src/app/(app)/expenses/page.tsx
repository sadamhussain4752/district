"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/components/app-shell/filters";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatINRCompact, formatNumber, formatDate } from "@/lib/utils";
import { ExpenseFormDialog, DeleteExpenseDialog, type ExpenseRow } from "./expense-dialogs";

type Row = ExpenseRow;

type Summary = {
  total: { amount: number; count: number };
  vendor: { amount: number; count: number };
  site: { amount: number; count: number };
  topCategories: { category: string; amount: number; count: number }[];
  categories: string[];
  paidBy: string[];
};

const baseColumns: Column<Row>[] = [
  {
    key: "date",
    header: "Date",
    sortable: true,
    render: (r) => (
      <div>
        <div className="whitespace-nowrap">{formatDate(r.date)}</div>
        <div className="text-xs text-muted-foreground">{r.expenseCode}</div>
      </div>
    ),
  },
  { key: "category", header: "Category", sortable: true, render: (r) => r.category },
  {
    key: "description",
    header: "Description",
    render: (r) => (
      <div className="max-w-xs">
        <div className="truncate" title={r.description ?? ""}>{r.description || "—"}</div>
        {r.remarks && (
          <div className="truncate text-xs text-muted-foreground" title={r.remarks}>{r.remarks}</div>
        )}
      </div>
    ),
  },
  { key: "vendor", header: "Vendor", render: (r) => r.vendor || "—" },
  { key: "paidBy", header: "Paid By", render: (r) => r.paidBy || "—" },
  {
    key: "location",
    header: "Location",
    render: (r) =>
      r.districtName ? (
        <div>
          <div>{r.districtName}</div>
          {r.mandalName && <div className="text-xs text-muted-foreground">{r.mandalName}</div>}
        </div>
      ) : (
        "—"
      ),
  },
  {
    key: "amount",
    header: "Amount",
    sortable: true,
    className: "text-right",
    render: (r) => <span className="tabular-nums">{formatINR(r.amount)}</span>,
  },
  { key: "paymentMode", header: "Mode", render: (r) => r.paymentMode || "—", defaultHidden: true },
  { key: "reference", header: "Chq / Ref No.", render: (r) => r.reference || "—", defaultHidden: true },
  { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} />, defaultHidden: true },
];

export default function ExpensesPage() {
  const { districtId } = useFilters();
  const [source, setSource] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [paidBy, setPaidBy] = React.useState("all");
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Row | null>(null);

  const columns = React.useMemo<Column<Row>[]>(
    () => [
      ...baseColumns,
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        exportable: false,
        render: (r) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit"
              aria-label={`Edit ${r.expenseCode}`} onClick={() => setEditing(r)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
              title="Delete" aria-label={`Delete ${r.expenseCode}`} onClick={() => setDeleting(r)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const params = {
    districtId: districtId ?? "",
    source: source === "all" ? "" : source,
    status: status === "all" ? "" : status,
    category: category === "all" ? "" : category,
    paidBy: paidBy === "all" ? "" : paidBy,
  };
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  const { data: s, isLoading } = useQuery<Summary>({
    queryKey: ["expenses-summary", qs],
    queryFn: () => fetch(`/api/expenses/summary?${qs}`).then((r) => r.json()),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses"
        description="Vendor payments and site expenditure"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Expenses" }]}
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Expense
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard loading={isLoading} label="Total Spend" tone="navy"
          value={formatINRCompact(s?.total.amount)} sub={`${formatNumber(s?.total.count ?? 0)} entries`} />
        <KpiCard loading={isLoading} label="Vendor Payments"
          value={formatINRCompact(s?.vendor.amount)} sub={`${formatNumber(s?.vendor.count ?? 0)} payments`} />
        <KpiCard loading={isLoading} label="Site Expenses" tone="warning"
          value={formatINRCompact(s?.site.amount)} sub={`${formatNumber(s?.site.count ?? 0)} entries`} />
        <KpiCard loading={isLoading} label="Top Category" tone="success"
          value={s?.topCategories[0] ? formatINRCompact(s.topCategories[0].amount) : "—"}
          sub={s?.topCategories[0]?.category ?? "—"} />
      </div>

      <DataTable<Row>
        endpoint="/api/expenses"
        queryKey={["expenses", qs]}
        columns={columns}
        extraParams={params}
        searchPlaceholder="Search vendor, description, ref no…"
        exportName="expenses"
        defaultSort="date"
        defaultDir="desc"
        toolbar={
          <>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="vendor">Vendor payments</SelectItem>
                <SelectItem value="site">Site expenses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(s?.categories ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Paid by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                {(s?.paidBy ?? []).map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="PM_APPROVED">PM Approved</SelectItem>
                <SelectItem value="ACCOUNTS_APPROVED">Accounts Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <ExpenseFormDialog
        open={adding || !!editing}
        expense={editing}
        categories={s?.categories ?? []}
        onClose={() => { setAdding(false); setEditing(null); }}
      />
      <DeleteExpenseDialog expense={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
