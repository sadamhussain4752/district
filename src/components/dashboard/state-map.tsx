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

const WIDTH = 720;
const HEIGHT = 520;

/** Soft, distinct fill per district (index-based, like a printed admin map). */
const DISTRICT_PALETTE = [
  "#cfe3f7", "#d9f0da", "#f7dce6", "#f3e8c8", "#e6dbf5", "#f6ddc9", "#d4eef0",
  "#f7d6d6", "#e3eccb", "#d7e0f5", "#f9e7bf", "#d5f2e4", "#f0d7ef", "#dbeafe",
  "#fde8d0", "#d8f3dc", "#fcd8e3", "#e8e2c6", "#e9dcfb", "#f8dcc7", "#cdeef2",
  "#f9d5d5", "#dff0c8", "#dae3f7", "#fbeac2", "#d2f0df", "#f2daf0", "#e0ecff",
  "#fdeed6", "#dbf5e0", "#fbdce8", "#ece5c9", "#ecdffc",
];

function completionColor(pct: number, hasData: boolean) {
  if (!hasData) return "hsl(214 20% 90%)";
  if (pct >= 80) return "hsl(142 60% 45%)";
  if (pct >= 50) return "hsl(217 71% 55%)";
  if (pct >= 20) return "hsl(38 92% 55%)";
  return "hsl(0 72% 58%)";
}

export function StateMap({
  stats,
  selectedDistrictId,
  onSelect,
  colorMode = "completion",
  showLabels = false,
  height,
}: {
  stats: DistrictStat[];
  selectedDistrictId: string | null;
  onSelect: (d: DistrictStat | null) => void;
  colorMode?: "completion" | "district";
  showLabels?: boolean;
  height?: number;
}) {
  const [hover, setHover] = React.useState<{
    stat: DistrictStat | null;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const { path, features, centroids } = React.useMemo(() => {
    const projection = geoMercator().fitSize([WIDTH, HEIGHT], GEO);
    const p = geoPath(projection);
    return {
      path: p,
      features: GEO.features,
      centroids: GEO.features.map((f) => p.centroid(f)),
    };
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
        style={height ? { maxHeight: height } : undefined}
        role="img"
        aria-label="Telangana district map"
        onMouseLeave={() => setHover(null)}
      >
        {features.map((f, i) => {
          const stat = resolve(f.properties);
          const d = path(f) ?? undefined;
          const selected =
            (stat && stat.id === selectedDistrictId) ||
            hover?.name === f.properties.name;
          const fill =
            colorMode === "district"
              ? DISTRICT_PALETTE[i % DISTRICT_PALETTE.length]
              : completionColor(stat?.completionPct ?? 0, !!stat);
          return (
            <path
              key={f.properties.name}
              d={d}
              className="map-district"
              data-selected={selected ? "true" : "false"}
              fill={fill}
              stroke={selected ? "hsl(0 72% 50%)" : "hsl(0 0% 100%)"}
              strokeWidth={selected ? 1.8 : 0.7}
              onMouseMove={(e) => {
                const rect = (
                  e.currentTarget.ownerSVGElement as SVGSVGElement
                ).getBoundingClientRect();
                const scale = WIDTH / rect.width;
                setHover({
                  stat,
                  name: f.properties.name,
                  x: (e.clientX - rect.left) * scale,
                  y: (e.clientY - rect.top) * scale,
                });
              }}
              onClick={() => onSelect(stat ?? null)}
            />
          );
        })}

        {showLabels &&
          features.map((f, i) => {
            const [cx, cy] = centroids[i];
            if (!Number.isFinite(cx)) return null;
            return (
              <text
                key={`l-${f.properties.name}`}
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  fill: "hsl(222 30% 25%)",
                  paintOrder: "stroke",
                  stroke: "hsla(0,0%,100%,0.85)",
                  strokeWidth: 2.5,
                }}
              >
                {f.properties.name}
              </text>
            );
          })}
      </svg>

      {colorMode === "completion" && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <LegendDot color="hsl(142 60% 45%)" label="≥ 80% completed" />
          <LegendDot color="hsl(217 71% 55%)" label="50–80%" />
          <LegendDot color="hsl(38 92% 55%)" label="20–50%" />
          <LegendDot color="hsl(0 72% 58%)" label="< 20% / critical" />
          <LegendDot color="hsl(214 20% 90%)" label="No data" />
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none absolute z-20 w-60 rounded-xl border bg-popover/95 p-4 text-xs shadow-xl backdrop-blur"
          style={{
            left: `${Math.min((hover.x / WIDTH) * 100, 62)}%`,
            top: `${Math.min((hover.y / HEIGHT) * 100 + 3, 70)}%`,
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            District
          </div>
          <div className="mb-2 text-base font-semibold">{hover.name}</div>
          {hover.stat ? (
            <dl className="space-y-1">
              <Row k="Applicants" v={formatNumber(hover.stat.applications)} />
              <Row k="Beneficiaries" v={formatNumber(hover.stat.approved)} />
              <Row k="Started" v={formatNumber(hover.stat.started)} />
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
            <p className="text-muted-foreground">
              No beneficiary files linked in this district yet.
            </p>
          )}
          <p className="mt-2 border-t pt-1.5 text-[10px] text-muted-foreground">
            Click to open this district
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
