"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { StateMap } from "@/components/dashboard/state-map";
import { useFilters } from "@/components/app-shell/filters";
import { formatINRCompact, formatNumber } from "@/lib/utils";
import directory from "@/data/telangana-directory.json";
import type { DistrictStat } from "@/lib/types";

type DirEntry = { mandalCount: number; villageCount: number; mandals: string[] };
const DIR = directory as Record<string, DirEntry>;
const DIR_TOTALS = Object.values(DIR).reduce(
  (a, d) => ({
    districts: a.districts + 1,
    mandals: a.mandals + d.mandalCount,
    villages: a.villages + d.villageCount,
  }),
  { districts: 0, mandals: 0, villages: 0 },
);

export default function MapPage() {
  const router = useRouter();
  const { districtId, setDistrict } = useFilters();

  const { data, isLoading } = useQuery<DistrictStat[]>({
    queryKey: ["dash-districts"],
    queryFn: () => fetch("/api/dashboard/districts").then((r) => r.json()),
  });

  const selected = data?.find((d) => d.id === districtId) ?? null;
  const selectedDir = selected ? DIR[selected.name] : null;

  const totals = React.useMemo(
    () =>
      (data ?? []).reduce(
        (a, d) => ({
          applicants: a.applicants + d.applications,
          beneficiaries: a.beneficiaries + d.approved,
        }),
        { applicants: 0, beneficiaries: 0 },
      ),
    [data],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Telangana — District View"
        description="Click a district to open its console. Colour = administrative district; hover for beneficiary counts."
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Map" }]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-3 sm:p-4">
            {isLoading ? (
              <Skeleton className="h-[520px] w-full" />
            ) : (
              <StateMap
                stats={data ?? []}
                selectedDistrictId={districtId}
                colorMode="district"
                showLabels
                onSelect={(d) => setDistrict(d?.id ?? null, d?.name ?? null)}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Statewide snapshot */}
          <Card>
            <CardContent className="pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Statewide Snapshot
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Counts across all beneficiary files in this console.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Metric label="Total Beneficiaries" value={formatNumber(totals.beneficiaries)} />
                <Metric label="Districts covered" value={formatNumber((data ?? []).filter((d) => d.applications > 0).length)} />
              </div>
            </CardContent>
          </Card>

          {/* Registration directory */}
          <Card>
            <CardContent className="pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Registration Directory
              </p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                <Metric label="Districts" value={formatNumber(DIR_TOTALS.districts)} />
                <Metric label="Mandals" value={formatNumber(DIR_TOTALS.mandals)} />
                <Metric label="Villages" value={formatNumber(DIR_TOTALS.villages)} />
              </div>
            </CardContent>
          </Card>

          {/* Selected district */}
          <Card className={selected ? "border-primary/40" : undefined}>
            <CardContent className="pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Selected District
              </p>
              {!selected ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Click a district on the map.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-lg font-semibold">{selected.name}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                    <Metric label="Beneficiaries" value={formatNumber(selected.applications)} />
                    <Metric label="Houses in Progress" value={formatNumber(selected.started)} />
                    <Metric label="Mandals (dir.)" value={formatNumber(selectedDir?.mandalCount ?? 0)} />
                    <Metric label="Villages (dir.)" value={formatNumber(selectedDir?.villageCount ?? 0)} />
                    <Metric label="Started" value={formatNumber(selected.started)} />
                    <Metric label="Completed" value={formatNumber(selected.completed)} />
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Completion</span>
                      <span className="font-semibold text-foreground">
                        {selected.completionPct.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={selected.completionPct} className="h-2" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Project value {formatINRCompact(selected.projectValue)} · spent{" "}
                      {formatINRCompact(selected.spent)}
                    </p>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant="success"
                    onClick={() =>
                      router.push(`/beneficiaries?districtId=${selected.id}`)
                    }
                  >
                    Open reports for this district <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selected && selectedDir && (
        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-sm font-semibold">
              {selected.name} — {selectedDir.mandalCount} mandals (LGD directory)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedDir.mandals.map((m) => (
                <span
                  key={m}
                  className="rounded-md border bg-muted/40 px-2 py-1 text-xs"
                >
                  {m}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
