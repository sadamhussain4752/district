"use client";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatINRCompact } from "@/lib/utils";

const NAVY = "hsl(217 71% 30%)";
const PALETTE = [
  "hsl(217 71% 35%)",
  "hsl(142 60% 38%)",
  "hsl(38 92% 48%)",
  "hsl(0 72% 52%)",
  "hsl(199 74% 44%)",
  "hsl(261 51% 51%)",
  "hsl(174 62% 37%)",
  "hsl(291 47% 47%)",
  "hsl(24 80% 50%)",
  "hsl(214 20% 60%)",
];

const axis = { fontSize: 11, fill: "hsl(215 16% 42%)" };

function ChartTooltip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      {label && <div className="mb-0.5 font-medium">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">
            {money ? formatINRCompact(p.value) : p.value.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => <span className="text-muted-foreground">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CategoryBar({
  data,
  money,
  color = NAVY,
  height = 260,
}: {
  data: { name: string; value: number }[];
  money?: boolean;
  color?: string;
  height?: number;
}) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="hsl(214 25% 90%)" />
        <XAxis
          type="number"
          tick={axis}
          tickFormatter={(v) => (money ? formatINRCompact(v) : v)}
        />
        <YAxis type="category" dataKey="name" width={130} tick={axis} />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: "hsl(214 32% 94%)" }} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgressTrend({
  data,
}: {
  data: { month: string; completed: number; avgDailyProgress: number }[];
}) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid stroke="hsl(214 25% 90%)" />
        <XAxis dataKey="month" tick={axis} />
        <YAxis tick={axis} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="completed"
          name="Houses completed"
          stroke={PALETTE[1]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="avgDailyProgress"
          name="Avg daily progress %"
          stroke={PALETTE[0]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DistrictComparison({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid vertical={false} stroke="hsl(214 25% 90%)" />
        <XAxis dataKey="name" tick={{ ...axis, fontSize: 10 }} angle={-25} textAnchor="end" height={60} interval={0} />
        <YAxis tick={axis} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(214 32% 94%)" }} />
        <Bar dataKey="value" name="Completion %" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.value >= 80
                  ? PALETTE[1]
                  : d.value >= 50
                    ? PALETTE[0]
                    : d.value >= 20
                      ? PALETTE[2]
                      : PALETTE[3]
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function NoData() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      No data for the current selection
    </div>
  );
}
