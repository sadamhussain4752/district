"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState, EmptyState } from "@/components/states";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINRCompact, formatINR, formatDate, formatNumber } from "@/lib/utils";

function F({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["project", id],
    queryFn: () => fetch(`/api/projects/${id}`).then((r) => r.json()),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || p?.error) return <ErrorState message={p?.error} onRetry={() => refetch()} />;

  const s = p.stats;

  return (
    <div className="space-y-5">
      <PageHeader
        title={p.name}
        description={`${p.code} · ${p.districtName} · FY ${p.financialYear}`}
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: p.code },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <KpiCard label="Planned Houses" value={formatNumber(p.plannedHouses)} tone="navy" />
        <KpiCard label="Created" value={formatNumber(s.totalHouses)} />
        <KpiCard label="Completed" value={formatNumber(s.completed)} tone="success" />
        <KpiCard label="Under Construction" value={formatNumber(s.underConstruction)} />
        <KpiCard label="Delayed" value={formatNumber(s.delayed)} tone="destructive" />
        <KpiCard label="Not Started" value={formatNumber(s.notStarted)} tone="warning" />
        <KpiCard label="Approved Budget" value={formatINRCompact(p.approvedBudget)} tone="navy" />
        <KpiCard label="Funds Received" value={formatINRCompact(s.fundsReceived)} tone="success" />
        <KpiCard label="Expenditure" value={formatINRCompact(s.expenditure)} />
        <KpiCard label="Balance" value={formatINRCompact(s.fundsReceived - s.expenditure)} />
        <div className="col-span-2 rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Overall Progress
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={p.progressPct} className="h-2.5" />
            <span className="text-lg font-bold tabular-nums">{p.progressPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="houses">Beneficiaries &amp; Houses</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <F label="Project Code" value={p.code} />
                <F label="Status" value={<StatusBadge status={p.status} />} />
                <F label="District" value={p.districtName} />
                <F label="Mandal" value={p.mandalName} />
                <F label="Start Date" value={formatDate(p.startDate)} />
                <F label="Target Date" value={formatDate(p.targetDate)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Team</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <F label="Project Manager" value={p.projectManager?.name} />
                <F label="PM Contact" value={p.projectManager?.mobile} />
                <F label="Contractor" value={p.contractor?.companyName} />
                <F label="Contractor Contact" value={p.contractor?.contactPhone} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="houses">
          {p.houses?.length ? (
            <Card><CardContent className="pt-5">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>House</TableHead><TableHead>Beneficiary</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="w-40">Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {p.houses.map((h: any) => (
                    <TableRow key={h.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/construction/${h.id}`} className="font-medium hover:underline">
                          {h.houseCode}
                        </Link>
                      </TableCell>
                      <TableCell>{h.beneficiary?.name}</TableCell>
                      <TableCell className="text-sm">{h.currentStageName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={h.progressPct} className="h-1.5" />
                          <span className="w-9 text-right text-xs tabular-nums">{h.progressPct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={h.status} /></TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(h.actualCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : <EmptyState title="No houses linked to this project yet" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
