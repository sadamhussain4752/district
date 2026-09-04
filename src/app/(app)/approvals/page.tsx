"use client";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states";
import { timeAgo } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  BENEFICIARY_VERIFICATION: "Beneficiary Verification",
  MATERIAL_REQUEST: "Material Request",
  PURCHASE_ORDER: "Purchase Order",
  EXPENSE: "Expense",
  CONTRACTOR_BILL: "Contractor Bill",
  STAGE_VERIFICATION: "Stage Verification",
  STOCK_TRANSFER: "Stock Transfer",
  PAYMENT_REQUEST: "Payment Request",
};

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<any>({
    queryKey: ["approvals"],
    queryFn: () => fetch("/api/approvals?status=PENDING").then((r) => r.json()),
  });

  const decide = useMutation({
    mutationFn: (payload: { id: string; decision: "APPROVED" | "REJECTED" }) =>
      fetch("/api/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed");
      }),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approval Inbox"
        description="Pending decisions routed to you"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Approvals" }]}
      />

      {!isLoading && data?.items?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.counts ?? {}).map(([k, v]) => (
            <Badge key={k} variant="secondary">
              {TYPE_LABELS[k] ?? k}: {v as number}
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 pt-5">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          {!isLoading && !data?.items?.length && (
            <EmptyState
              icon={Check}
              title="No pending approvals"
              description="Approval requests for beneficiary verification, material requests, expenses, contractor bills and stage verification appear here."
            />
          )}
          {data?.items?.map((a: any) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{TYPE_LABELS[a.type] ?? a.type}</Badge>
                  <span className="font-medium">{a.entityLabel ?? a.entityId}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Requested {timeAgo(a.requestedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: a.id, decision: "REJECTED" })}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: a.id, decision: "APPROVED" })}
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
