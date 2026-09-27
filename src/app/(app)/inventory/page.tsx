"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
        description="Current material stock and purchase amount from MATERIAL INVENTORY - SUMMAR (U)"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Inventory" }]}
        actions={<Button asChild><Link href="/purchases"><ShoppingCart className="h-4 w-4" /> Purchase / Add Stock</Link></Button>}
      />

      {isLoading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Stock Amount" value={formatINRCompact(data.summary.totalValue)} tone="navy" />
          <KpiCard label="Purchase Entries" value={formatNumber(data.summary.purchaseRows)} />
          <KpiCard label="Materials" value={formatNumber(data.summary.materials)} tone="warning" />
          <KpiCard label="Locations" value={formatNumber(data.summary.locations)} tone="success" />
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
                <TableHead className="text-right">Stock Quantity</TableHead>
                <TableHead className="text-right">Average Rate</TableHead>
                <TableHead className="text-right">Stock Amount</TableHead>
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
                    {i.quantity ? formatINR(i.value / i.quantity) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(i.value)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && !items.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
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
