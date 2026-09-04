"use client";
import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import tgGeo from "@/data/telangana-districts.geo.json";
import type { DistrictStat } from "@/lib/types";
import { formatINRCompact, formatNumber, cn } from "@/lib/utils";

const GEO = tgGeo as unknown as FeatureCollection<
  Geometry,
  { name: string; geoKey: string }
>;

const WIDTH = 640;
const HEIGHT = 460;

function colorFor(pct: number, hasData: boolean) {
  if (!hasData) return "hsl(214 20% 88%)";
  if (pct >= 80) return "hsl(142 60% 40%)";
  if (pct >= 50) return "hsl(217 71% 45%)";
  if (pct >= 20) return "hsl(38 92% 50%)";
  return "hsl(0 72% 52%)";
}

export function StateMap({
  stats,
  selectedDistrictId,
  onSelect,
}: {
  stats: DistrictStat[];
  selectedDistrictId: string | null;
  onSelect: (d: DistrictStat | null) => void;
}) {
  const [hover, setHover] = React.useState<{
    stat: DistrictStat | null;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const { path, features } = React.useMemo(() => {
    const projection = geoMercator().fitSize([WIDTH, HEIGHT], GEO);
    return { path: geoPath(projection), features: GEO.features };
  }, []);

  const byGeoKey = React.useMemo(() => {
    const m = new Map<string, DistrictStat>();
    for (const s of stats) if (s.geoKey) m.set(s.geoKey, s);
    return m;
  }, [stats]);

  const byName = React.useMemo(() => {
    const m = new Map<string, DistrictStat>();
    for (const s of stats) m.set(s.name.toLowerCase(), s);
    return m;
  }, [stats]);

  const resolve = (props: { name: string; geoKey: string }) =>
    byGeoKey.get(props.geoKey) ?? byName.get(props.name.toLowerCase()) ?? null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Telangana district completion map"
        onMouseLeave={() => setHover(null)}
      >
        {features.map((f, i) => {
          const stat = resolve(f.properties);
          const d = path(f) ?? undefined;
          const selected = stat && stat.id === selectedDistrictId;
          return (
            <path
              key={i}
              d={d}
              className="map-district"
              data-selected={selected ? "true" : "false"}
              fill={colorFor(stat?.completionPct ?? 0, !!stat)}
              onMouseMove={(e) => {
                const rect = (
                  e.currentTarget.ownerSVGElement as SVGSVGElement
                ).getBoundingClientRect();
                setHover({
                  stat,
                  name: f.properties.name,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onClick={() =>
                stat &&
                onSelect(stat.id === selectedDistrictId ? null : stat)
              }
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <LegendDot color="hsl(142 60% 40%)" label="≥ 80% completed" />
        <LegendDot color="hsl(217 71% 45%)" label="50–80%" />
        <LegendDot color="hsl(38 92% 50%)" label="20–50%" />
        <LegendDot color="hsl(0 72% 52%)" label="< 20% / critical" />
        <LegendDot color="hsl(214 20% 88%)" label="No data" />
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-md border bg-popover p-3 text-xs shadow-lg"
          style={{
            left: Math.min(hover.x + 12, WIDTH - 200),
            top: hover.y + 12,
          }}
        >
          <div className="mb-1 text-sm font-semibold">{hover.name}</div>
          {hover.stat ? (
            <dl className="space-y-0.5">
              <Row k="Applications" v={formatNumber(hover.stat.applications)} />
              <Row k="Approved" v={formatNumber(hover.stat.approved)} />
              <Row k="Started" v={formatNumber(hover.stat.started)} />
              <Row
                k="Under Construction"
                v={formatNumber(hover.stat.underConstruction)}
              />
              <Row k="Completed" v={formatNumber(hover.stat.completed)} />
              <Row k="Not Started" v={formatNumber(hover.stat.notStarted)} />
              <Row k="Project Value" v={formatINRCompact(hover.stat.projectValue)} />
              <Row k="Spent" v={formatINRCompact(hover.stat.spent)} />
              <Row
                k="Completion"
                v={`${hover.stat.completionPct.toFixed(1)}%`}
                strong
              />
            </dl>
          ) : (
            <p className="text-muted-foreground">No project data yet.</p>
          )}
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Click to filter the dashboard
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("tabular-nums", strong && "font-semibold text-foreground")}>
        {v}
      </dd>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
