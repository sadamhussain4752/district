"use client";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/components/app-shell/filters";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatINR, formatDate } from "@/lib/utils";

type Row = {
  id: string;
  expenseCode: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  gst: number;
  vendor: string | null;
  paymentMode: string | null;
  status: string;
};

const columns: Column<Row>[] = [
  {
    key: "expenseCode",
    header: "Expense",
    render: (r) => (
      <div>
        <div className="font-medium">{r.expenseCode}</div>
        <div className="text-xs text-muted-foreground">{formatDate(r.date)}</div>
      </div>
    ),
  },
  { key: "category", header: "Category", render: (r) => r.category },
  { key: "vendor", header: "Vendor", render: (r) => r.vendor || "—" },
  {
    key: "amount",
    header: "Amount",
    sortable: true,
    className: "text-right",
    render: (r) => <span className="tabular-nums">{formatINR(r.amount)}</span>,
  },
  { key: "paymentMode", header: "Mode", render: (r) => r.paymentMode || "—", defaultHidden: true },
  { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
];

export default function ExpensesPage() {
  const { districtId } = useFilters();
  const [status, setStatus] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Site and project expenditure with approval workflow"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Expenses" }]}
      />
      <DataTable<Row>
        endpoint="/api/expenses"
        queryKey={["expenses", districtId, status, category]}
        columns={columns}
        extraParams={{
          districtId: districtId ?? "",
          status: status === "all" ? "" : status,
          category: category === "all" ? "" : category,
        }}
        searchPlaceholder="Search code, vendor, category…"
        exportName="expenses"
        toolbar={
          <>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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
    </div>
  );
}
