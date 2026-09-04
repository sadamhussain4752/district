"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, PlayCircle, Wallet, PackageOpen, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StateMap } from "@/components/dashboard/state-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/components/app-shell/filters";
import { formatINRCompact, formatNumber, timeAgo, pct } from "@/lib/utils";
import type { DashboardKpis, DistrictStat } from "@/lib/types";

export default function CommandCenterPage() {
  const { districtId, setDistrict } = useFilters();

  const today = useQuery<any>({
    queryKey: ["cc-today"],
    queryFn: () => fetch("/api/dashboard/today").then((r) => r.json()),
  });
  const kpis = useQuery<DashboardKpis>({
    queryKey: ["dash-summary", ""],
    queryFn: () => fetch("/api/dashboard/summary").then((r) => r.json()),
  });
  const districts = useQuery<DistrictStat[]>({
    queryKey: ["dash-districts"],
    queryFn: () => fetch("/api/dashboard/districts").then((r) => r.json()),
  });
  const charts = useQuery<any>({
    queryKey: ["dash-charts", null],
    queryFn: () => fetch("/api/dashboard/charts").then((r) => r.json()),
  });
  const activity = useQuery<any[]>({
    queryKey: ["dash-activity"],
    queryFn: () => fetch("/api/dashboard/activity?take=10").then((r) => r.json()),
  });

  const t = today.data;
  const ranking = [...(districts.data ?? [])].sort((a, b) => b.completionPct - a.completionPct);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Command Center"
        description="Live operational picture across the state"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Command Center" }]}
      />

      <div className="rounded-lg border bg-navy p-5 text-navy-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">
              Overall Project Completion
            </p>
            <p className="text-4xl font-bold tabular-nums">
              {kpis.data ? pct(kpis.data.overallCompletionPct) : "—"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-5">
            <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Completed today" value={t ? formatNumber(t.completedToday) : "—"} />
            <Metric icon={<PlayCircle className="h-4 w-4" />} label="Started today" value={t ? formatNumber(t.startedToday) : "—"} />
            <Metric icon={<Wallet className="h-4 w-4" />} label="Spent today" value={t ? formatINRCompact(t.spentToday) : "—"} />
            <Metric icon={<PackageOpen className="h-4 w-4" />} label="Material issued" value={t ? formatNumber(t.materialIssuedToday) : "—"} />
            <Metric icon={<TriangleAlert className="h-4 w-4" />} label="Critical issues" value={t ? formatNumber(t.openCriticalIssues) : "—"} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Completed Houses" value={formatNumber(kpis.data?.completedHouses)} loading={kpis.isLoading} tone="success" />
        <KpiCard label="Under Construction" value={formatNumber(kpis.data?.underConstruction)} loading={kpis.isLoading} />
        <KpiCard label="Delayed Houses" value={formatNumber(kpis.data?.delayedHouses)} loading={kpis.isLoading} tone="destructive" />
        <KpiCard label="Pending Payments" value={formatINRCompact(kpis.data?.pendingPayments)} loading={kpis.isLoading} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>State Map</CardTitle></CardHeader>
          <CardContent>
            {districts.isLoading ? (
              <Skeleton className="h-[460px] w-full" />
            ) : (
              <StateMap
                stats={districts.data ?? []}
                selectedDistrictId={districtId}
                onSelect={(d) => setDistrict(d?.id ?? null, d?.name ?? null)}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>District Ranking</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ranking.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setDistrict(d.id, d.name)}
                className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                <span className="flex-1 font-medium">{d.name}</span>
                <Progress value={d.completionPct} className="h-1.5 w-16" />
                <span className="w-9 text-right text-xs tabular-nums">
                  {d.completionPct.toFixed(0)}%
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Critical Projects</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(charts.data?.topDelayed ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No critical sites.</p>
            )}
            {(charts.data?.topDelayed ?? []).map((h: any) => (
              <Link
                key={h.id}
                href={`/construction/${h.id}`}
                className="flex items-center justify-between rounded-md border px-2.5 py-2 text-sm hover:bg-accent"
              >
                <span className="font-medium">{h.houseCode}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">{h.progressPct}%</span>
                  <StatusBadge status={h.health} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Material Shortages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(charts.data?.materialAlerts ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No shortages.</p>
            )}
            {(charts.data?.materialAlerts ?? []).map((m: any, i: number) => (
              <div key={`${m.name}-${i}`} className="flex items-center justify-between rounded-md border px-2.5 py-2 text-sm">
                <span className="font-medium">{m.name}</span>
                <Badge variant={m.severity === "critical" ? "destructive" : "warning"}>
                  {formatNumber(m.quantity)} {m.unit}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activity.data?.map((a) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="leading-snug">{a.summary}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-white/60">{icon}<span className="text-xs">{label}</span></div>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
