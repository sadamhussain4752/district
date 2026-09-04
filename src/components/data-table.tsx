"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ArrowUpDown, ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal,
  Loader2,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/states";
import type { Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
  defaultHidden?: boolean;
};

export function DataTable<T extends { id: string }>({
  endpoint,
  queryKey,
  columns,
  extraParams = {},
  rowHref,
  searchPlaceholder = "Search…",
  exportName = "export",
  toolbar,
}: {
  endpoint: string;
  queryKey: unknown[];
  columns: Column<T>[];
  extraParams?: Record<string, string | number | undefined>;
  rowHref?: (row: T) => string;
  searchPlaceholder?: string;
  exportName?: string;
  toolbar?: React.ReactNode;
}) {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [sort, setSort] = React.useState<string>("createdAt");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");
  const [hidden, setHidden] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)),
  );

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort,
    dir,
  });
  if (debouncedQ) params.set("q", debouncedQ);
  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery<
    Paginated<T>
  >({
    queryKey: [...queryKey, params.toString()],
    queryFn: async () => {
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const visibleColumns = columns.filter((c) => !hidden.has(c.key));

  const toggleSort = (key: string) => {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir("asc");
    }
  };

  const exportCsv = () => {
    const rows = data?.data ?? [];
    const header = visibleColumns.map((c) => c.header).join(",");
    const body = rows
      .map((r) =>
        visibleColumns
          .map((c) => {
            const el = c.render(r);
            const text =
              typeof el === "string" || typeof el === "number"
                ? String(el)
                : extractText(r, c.key);
            return `"${String(text).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden.has(c.key)}
                  onCheckedChange={(checked) => {
                    setHidden((prev) => {
                      const next = new Set(prev);
                      if (checked) next.delete(c.key);
                      else next.add(c.key);
                      return next;
                    });
                  }}
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.sortable ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {c.header}
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3",
                          sort === c.key ? "text-foreground" : "opacity-40",
                        )}
                      />
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {visibleColumns.map((c) => (
                    <TableCell key={c.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading &&
              data?.data.map((row) => (
                <TableRow
                  key={row.id}
                  className={rowHref ? "cursor-pointer" : undefined}
                  onClick={
                    rowHref ? () => router.push(rowHref(row)) : undefined
                  }
                >
                  {visibleColumns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {!isLoading && isError && (
          <div className="p-4">
            <ErrorState onRetry={() => refetch()} />
          </div>
        )}
        {!isLoading && !isError && !data?.data.length && (
          <div className="p-4">
            <EmptyState
              title="No records found"
              description="Try adjusting your search or filters."
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>
          {total > 0 && (
            <>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} of {total.toLocaleString("en-IN")}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 rounded-md border bg-card px-2 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function extractText(row: Record<string, unknown>, key: string): string {
  const v = key.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[k];
    return undefined;
  }, row);
  return v == null ? "" : String(v);
}
