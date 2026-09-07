"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, TriangleAlert, Activity } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StateMap } from "@/components/dashboard/state-map";
import {
  DonutChart, ProgressTrend, DistrictComparison,
} from "@/components/dashboard/charts";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useFilters } from "@/components/app-shell/filters";
import {
  formatINRCompact, formatNumber, timeAgo, pct,
} from "@/lib/utils";
import type { DashboardKpis, DistrictStat } from "@/lib/types";

export default function DashboardPage() {
  const { districtId, districtName, fy, setDistrict } = useFilters();

  const qs = new URLSearchParams();
  if (districtId) qs.set("districtId", districtId);
  if (fy) qs.set("fy", fy);
  const suffix = qs.toString() ? `?${qs}` : "";

  const kpis = useQuery<DashboardKpis>({
    queryKey: ["dash-summary", suffix],
    queryFn: () => fetch(`/api/dashboard/summary${suffix}`).then((r) => r.json()),
  });
  const districts = useQuery<DistrictStat[]>({
    queryKey: ["dash-districts"],
    queryFn: () => fetch("/api/dashboard/districts").then((r) => r.json()),
  });
  const charts = useQuery<any>({
    queryKey: ["dash-charts", districtId],
    queryFn: () =>
      fetch(
        `/api/dashboard/charts${districtId ? `?districtId=${districtId}` : ""}`,
      ).then((r) => r.json()),
  });
  const activity = useQuery<any[]>({
    queryKey: ["dash-activity"],
    queryFn: () => fetch("/api/dashboard/activity?take=12").then((r) => r.json()),
  });

  const k = kpis.data;
  const loading = kpis.isLoading;

  const districtRanking = React.useMemo(() => {
    return [...(districts.data ?? [])]
      .sort((a, b) => b.completionPct - a.completionPct);
  }, [districts.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Command Centre"
        description={
          districtName
            ? `Filtered to ${districtName} district · FY ${fy}`
            : `Statewide performance · FY ${fy}`
        }
        breadcrumbs={[{ label: "Home" }, { label: "Dashboard" }]}
        actions={
          <Link
            href="/executive-mis"
            className="text-sm font-medium text-primary hover:underline"
          >
            Executive MIS <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total Applications" value={formatNumber(k?.totalApplications)} loading={loading} tone="navy" />
        <KpiCard label="Beneficiaries" value={formatNumber(k?.totalBeneficiaries)} loading={loading} href="/beneficiaries" />
        <KpiCard label="Verified" value={formatNumber(k?.verifiedBeneficiaries)} loading={loading} tone="success" />
        <KpiCard label="Approved Houses" value={formatNumber(k?.approvedHouses)} loading={loading} />
        <KpiCard label="Construction Started" value={formatNumber(k?.constructionStarted)} loading={loading} href="/construction" />
        <KpiCard label="Not Started" value={formatNumber(k?.notStarted)} loading={loading} tone="warning" />
        <KpiCard label="Under Construction" value={formatNumber(k?.underConstruction)} loading={loading} href="/construction" />
        <KpiCard label="Completed" value={formatNumber(k?.completedHouses)} loading={loading} tone="success" />
        <KpiCard label="Delayed" value={formatNumber(k?.delayedHouses)} loading={loading} tone="destructive" href="/construction?health=delayed" />
        <KpiCard label="Overall Completion" value={pct(k?.overallCompletionPct)} loading={loading} tone="navy" />
        <KpiCard label="Inventory Value" value={formatINRCompact(k?.inventoryValue)} loading={loading} href="/inventory" />
        <KpiCard label="Low Stock Items" value={formatNumber(k?.lowStockItems)} loading={loading} tone={k && k.lowStockItems > 0 ? "warning" : "default"} href="/inventory" />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Total Project Value" value={formatINRCompact(k?.totalProjectValue)} loading={loading} tone="navy" />
        <KpiCard label="Govt Funds Received" value={formatINRCompact(k?.fundsReceived)} loading={loading} tone="success" href="/funds" />
        <KpiCard label="Amount Released" value={formatINRCompact(k?.amountReleased)} loading={loading} href="/payments" />
        <KpiCard label="Total Expenditure" value={formatINRCompact(k?.totalExpenditure)} loading={loading} href="/expenses" />
        <KpiCard label="Available Balance" value={formatINRCompact(k?.availableBalance)} loading={loading} tone={k && k.availableBalance < 0 ? "destructive" : "success"} />
      </div>

      {/* Map + right panel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>District Completion Map — Telangana</CardTitle>
              <p className="text-sm text-muted-foreground">
                Colour indicates completion %. Click a district to drill down.
              </p>
            </div>
            {districtId && (
              <button
                onClick={() => setDistrict(null)}
                className="text-xs text-primary hover:underline"
              >
                Clear selection
              </button>
            )}
          </CardHeader>
          <CardContent>
            {districts.isLoading ? (
              <Skeleton className="h-[460px] w-full" />
            ) : (
              <StateMap
                stats={districts.data ?? []}
                selectedDistrictId={districtId}
                showLabels
                onSelect={(d) => setDistrict(d?.id ?? null, d?.name ?? null)}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Health</CardTitle>
            </CardHeader>
            <CardContent>
              {charts.isLoading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (
                <DonutChart data={charts.data?.projectHealth ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-warning" />
              <CardTitle>Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(charts.data?.topDelayed ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No delayed sites in the current selection.
                </p>
              )}
              {(charts.data?.topDelayed ?? []).slice(0, 5).map((h: any) => (
                <Link
                  key={h.id}
                  href={`/construction/${h.id}`}
                  className="flex items-center justify-between rounded-md border px-2.5 py-2 text-sm hover:bg-accent"
                >
                  <div>
                    <div className="font-medium">{h.houseCode}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.stage || "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={h.health} />
                    <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {h.progressPct}%
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trend + status donuts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Construction Progress Trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly completed houses &amp; average daily progress
            </p>
          </CardHeader>
          <CardContent>
            {charts.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ProgressTrend data={charts.data?.monthlyProgress ?? []} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Beneficiary Status</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <DonutChart data={charts.data?.beneficiaryStatus ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* District performance */}
      <Card>
        <CardHeader>
          <CardTitle>District Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ranked by completion percentage
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <DistrictComparison
            data={districtRanking.map((d) => ({
              name: d.name,
              value: d.completionPct,
            }))}
          />
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead className="text-right">Applications</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Delayed</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="w-40">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {districtRanking.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => setDistrict(d.id, d.name)}
                  >
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(d.applications)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(d.started)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(d.completed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.delayed > 0 ? (
                        <Badge variant="destructive">{d.delayed}</Badge>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINRCompact(d.projectValue)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={d.completionPct} className="h-1.5" />
                        <span className="w-10 text-right text-xs tabular-nums">
                          {d.completionPct.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Material alerts + Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Material Alerts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Items at or below reorder level
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(charts.data?.materialAlerts ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                All tracked materials are above reorder level.
              </p>
            )}
            {(charts.data?.materialAlerts ?? []).map((m: any, i: number) => (
              <div
                key={`${m.name}-${i}`}
                className="flex items-center justify-between rounded-md border px-2.5 py-2 text-sm"
              >
                <span className="font-medium">{m.name}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">
                    {formatNumber(m.quantity)} / {formatNumber(m.reorderLevel)}{" "}
                    {m.unit}
                  </span>
                  <Badge
                    variant={m.severity === "critical" ? "destructive" : "warning"}
                  >
                    {m.severity}
                  </Badge>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            {activity.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
            {activity.data?.map((a) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="leading-snug">{a.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.actorName} · {timeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
