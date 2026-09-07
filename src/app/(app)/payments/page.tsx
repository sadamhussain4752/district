"use client";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatINR, formatDate } from "@/lib/utils";
import { PAYMENT_MILESTONE_LABELS } from "@/lib/constants";

type Row = {
  id: string;
  milestone: string;
  eligibleAmount: number;
  releasedAmount: number;
  status: string;
  txnRef: string | null;
  bankName: string | null;
  paymentDate: string | null;
  beneficiary: {
    name: string;
    beneficiaryCode: string;
    district: { name: string } | null;
  };
};

const columns: Column<Row>[] = [
  {
    key: "beneficiary",
    header: "Beneficiary",
    render: (r) => (
      <div>
        <div className="font-medium">{r.beneficiary.name}</div>
        <div className="text-xs text-muted-foreground">
          {r.beneficiary.beneficiaryCode} · {r.beneficiary.district?.name}
        </div>
      </div>
    ),
  },
  { key: "milestone", header: "Milestone", render: (r) => PAYMENT_MILESTONE_LABELS[r.milestone] ?? r.milestone },
  { key: "eligibleAmount", header: "Eligible", sortable: true, className: "text-right", render: (r) => <span className="tabular-nums">{formatINR(r.eligibleAmount)}</span> },
  { key: "releasedAmount", header: "Released", sortable: true, className: "text-right", render: (r) => <span className="tabular-nums">{formatINR(r.releasedAmount)}</span> },
  { key: "txnRef", header: "Txn Ref", render: (r) => <span className="text-xs">{r.txnRef || "—"}</span> },
  { key: "paymentDate", header: "Paid On", sortable: true, render: (r) => formatDate(r.paymentDate) },
  { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
];

export default function PaymentsPage() {
  const [status, setStatus] = React.useState("all");
  const [milestone, setMilestone] = React.useState("all");
  return (
    <div>
      <PageHeader
        title="Beneficiary Payments"
        description="Government payment milestones — immutable ledger of releases"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Payments" }]}
      />
      <DataTable<Row>
        endpoint="/api/payments"
        queryKey={["payments", status, milestone]}
        columns={columns}
        extraParams={{
          status: status === "all" ? "" : status,
          milestone: milestone === "all" ? "" : milestone,
        }}
        searchPlaceholder="Search beneficiary, code, txn ref…"
        exportName="payments"
        toolbar={
          <>
            <Select value={milestone} onValueChange={setMilestone}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Milestone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All milestones</SelectItem>
                <SelectItem value="FOUNDATION">Foundation</SelectItem>
                <SelectItem value="PLINTH">Plinth</SelectItem>
                <SelectItem value="ROOF">Roof</SelectItem>
                <SelectItem value="COMPLETION">Completion</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ELIGIBLE">Eligible</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
