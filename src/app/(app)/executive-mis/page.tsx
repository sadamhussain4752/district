"use client";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFilters } from "@/components/app-shell/filters";
import { CLIENT_NAME } from "@/lib/constants";
import { formatINRCompact, formatNumber, pct } from "@/lib/utils";
import type { DashboardKpis, DistrictStat } from "@/lib/types";

export default function ExecutiveMisPage() {
  const { fy } = useFilters();
  const kpis = useQuery<DashboardKpis>({
    queryKey: ["dash-summary", fy],
    queryFn: () => fetch(`/api/dashboard/summary?fy=${fy}`).then((r) => r.json()),
  });
  const districts = useQuery<DistrictStat[]>({
    queryKey: ["dash-districts"],
    queryFn: () => fetch("/api/dashboard/districts").then((r) => r.json()),
  });

  const k = kpis.data;
  const ranking = [...(districts.data ?? [])].sort(
    (a, b) => b.completionPct - a.completionPct,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Executive Project Summary"
        description={`Indiramma Illu · FY ${fy} · Managed by ${CLIENT_NAME}`}
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Executive MIS" }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        }
      />

      {kpis.isLoading || !k ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Line label="Total Houses (approved)" value={formatNumber(k.approvedHouses)} />
          <Line label="Construction Started" value={formatNumber(k.constructionStarted)} />
          <Line label="Completed" value={formatNumber(k.completedHouses)} tone="success" />
          <Line label="Delayed" value={formatNumber(k.delayedHouses)} tone="destructive" />
          <Line label="Overall Completion" value={pct(k.overallCompletionPct)} tone="navy" />
          <Line label="Approved Budget" value={formatINRCompact(k.totalProjectValue)} />
          <Line label="Funds Received" value={formatINRCompact(k.fundsReceived)} />
          <Line label="Total Expenditure" value={formatINRCompact(k.totalExpenditure)} />
          <Line label="Available Balance" value={formatINRCompact(k.availableBalance)} />
          <Line label="Material / Inventory Value" value={formatINRCompact(k.inventoryValue)} />
          <Line label="Pending Payments" value={formatINRCompact(k.pendingPayments)} tone="warning" />
          <Line label="Low Stock Items" value={formatNumber(k.lowStockItems)} tone="warning" />
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-3 text-sm font-semibold">District Ranking</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>District</TableHead>
                <TableHead className="text-right">Houses</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Delayed</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="w-40">Progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((d, i) => (
                <TableRow key={d.id}>
                  <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.applications)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.started)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.completed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.delayed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINRCompact(d.projectValue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINRCompact(d.spent)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={d.completionPct} className="h-1.5" />
                      <span className="w-9 text-right text-xs tabular-nums">{d.completionPct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        d.completionPct >= 80
                          ? "HEALTHY"
                          : d.completionPct >= 40
                            ? "ATTENTION"
                            : "CRITICAL"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Line({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "destructive" | "navy";
}) {
  const c = {
    default: "border-l-border",
    success: "border-l-success",
    warning: "border-l-warning",
    destructive: "border-l-destructive",
    navy: "border-l-navy",
  }[tone];
  return (
    <div className={`rounded-md border border-l-4 bg-card p-3 ${c}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
