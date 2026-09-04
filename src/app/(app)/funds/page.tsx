"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFilters } from "@/components/app-shell/filters";
import { formatINRCompact, formatINR, formatDate, pct } from "@/lib/utils";

export default function FundsPage() {
  const { fy, districtId } = useFilters();
  const qs = new URLSearchParams();
  if (fy) qs.set("fy", fy);
  if (districtId) qs.set("districtId", districtId);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["funds", fy, districtId],
    queryFn: () => fetch(`/api/funds?${qs}`).then((r) => r.json()),
  });

  const s = data?.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Government Fund Management"
        description="Sanctions, releases and utilisation tracking"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Government Funds" }]}
      />

      {isLoading || !s ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Total Sanctioned" value={formatINRCompact(s.totalSanctioned)} tone="navy" />
            <KpiCard label="Total Received" value={formatINRCompact(s.totalReceived)} tone="success" />
            <KpiCard label="Total Utilised" value={formatINRCompact(s.totalUtilized)} />
            <KpiCard label="Available Balance" value={formatINRCompact(s.balance)} tone={s.balance < 0 ? "destructive" : "success"} />
          </div>
          <Card>
            <CardContent className="pt-5">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Fund Utilisation</span>
                <span className="font-semibold">{pct(s.utilizationPct)}</span>
              </div>
              <Progress value={s.utilizationPct} className="h-3" />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-3 text-sm font-semibold">Release Records</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release No</TableHead>
                <TableHead>FY</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.releases?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.releaseNo}</TableCell>
                  <TableCell>{r.financialYear}</TableCell>
                  <TableCell>{r.districtName}</TableCell>
                  <TableCell className="text-sm">{r.department}</TableCell>
                  <TableCell className="text-sm">{formatDate(r.releaseDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(r.amount)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && !data?.releases?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No fund releases recorded for this selection.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
