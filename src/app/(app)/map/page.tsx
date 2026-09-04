"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StateMap } from "@/components/dashboard/state-map";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFilters } from "@/components/app-shell/filters";
import { formatINRCompact, formatNumber } from "@/lib/utils";
import type { DistrictStat } from "@/lib/types";

export default function MapPage() {
  const router = useRouter();
  const { districtId, setDistrict } = useFilters();

  const { data, isLoading } = useQuery<DistrictStat[]>({
    queryKey: ["dash-districts"],
    queryFn: () => fetch("/api/dashboard/districts").then((r) => r.json()),
  });

  const selected = data?.find((d) => d.id === districtId) ?? null;

  const { data: mandals } = useQuery<any[]>({
    queryKey: ["map-mandals", districtId],
    queryFn: () =>
      fetch(`/api/locations/mandals?districtId=${districtId}`).then((r) => r.json()),
    enabled: !!districtId,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Map Overview"
        description="Geographical view of Indiramma Illu delivery across Telangana"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Map Overview" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Telangana — District Completion</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[460px] w-full" />
            ) : (
              <StateMap
                stats={data ?? []}
                selectedDistrictId={districtId}
                onSelect={(d) => setDistrict(d?.id ?? null, d?.name ?? null)}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected ? selected.name : "Select a district"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected && (
              <p className="text-sm text-muted-foreground">
                Click a district on the map to see its overview and drill into
                mandals.
              </p>
            )}
            {selected && (
              <>
                <Stat k="Applications" v={formatNumber(selected.applications)} />
                <Stat k="Approved" v={formatNumber(selected.approved)} />
                <Stat k="Construction Started" v={formatNumber(selected.started)} />
                <Stat k="Under Construction" v={formatNumber(selected.underConstruction)} />
                <Stat k="Completed" v={formatNumber(selected.completed)} />
                <Stat k="Not Started" v={formatNumber(selected.notStarted)} />
                <Stat k="Delayed" v={formatNumber(selected.delayed)} />
                <Stat k="Project Value" v={formatINRCompact(selected.projectValue)} />
                <Stat k="Amount Spent" v={formatINRCompact(selected.spent)} />
                <div className="pt-1">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Completion</span>
                    <span className="font-semibold text-foreground">
                      {selected.completionPct.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={selected.completionPct} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.name} — Mandals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mandal</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mandals?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.code}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() =>
                          router.push(`/beneficiaries?mandalId=${m.id}`)
                        }
                        className="text-xs text-primary hover:underline"
                      >
                        View beneficiaries →
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {!mandals?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Loading mandals…
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium tabular-nums">{v}</span>
    </div>
  );
}
