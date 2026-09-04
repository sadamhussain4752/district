"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINRCompact, formatINR, formatNumber } from "@/lib/utils";

export default function InventoryPage() {
  const [warehouseId, setWarehouseId] = React.useState("all");
  const [q, setQ] = React.useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["inventory", warehouseId],
    queryFn: () =>
      fetch(
        `/api/inventory${warehouseId !== "all" ? `?warehouseId=${warehouseId}` : ""}`,
      ).then((r) => r.json()),
  });

  const items = (data?.items ?? []).filter((i: any) =>
    i.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Material stock across state, district, mandal and site warehouses"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Inventory" }]}
      />

      {isLoading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Inventory Value" value={formatINRCompact(data.summary.totalValue)} tone="navy" />
          <KpiCard label="Critical" value={formatNumber(data.summary.critical)} tone="destructive" />
          <KpiCard label="Low Stock" value={formatNumber(data.summary.low)} tone="warning" />
          <KpiCard label="Healthy" value={formatNumber(data.summary.healthy)} tone="success" />
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search material…"
              className="sm:max-w-xs"
            />
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="h-9 w-64">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses (aggregated)</SelectItem>
                {data?.warehouses?.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">In Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.category}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(i.quantity)} {i.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(i.reorderLevel)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(i.value)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        i.status === "CRITICAL"
                          ? "destructive"
                          : i.status === "LOW"
                            ? "warning"
                            : "success"
                      }
                    >
                      {i.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !items.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No materials match.
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
