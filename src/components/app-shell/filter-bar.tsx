"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { X, SlidersHorizontal } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { useFilters } from "./filters";

type District = { id: string; name: string };

export function FilterBar() {
  const { fy, setFy, districtId, districtName, setDistrict } = useFilters();

  const { data: districts } = useQuery<District[]>({
    queryKey: ["districts-list"],
    queryFn: async () => {
      const res = await fetch("/api/locations/districts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-3 py-2 text-sm sm:px-4">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
      </span>

      <Select value={fy} onValueChange={setFy}>
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue placeholder="Financial Year" />
        </SelectTrigger>
        <SelectContent>
          {FINANCIAL_YEARS.map((y) => (
            <SelectItem key={y} value={y}>
              FY {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={districtId ?? "ALL"}
        onValueChange={(v) => {
          if (v === "ALL") setDistrict(null);
          else
            setDistrict(
              v,
              districts?.find((d) => d.id === v)?.name ?? null,
            );
        }}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue placeholder="All Districts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Districts</SelectItem>
          {districts?.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {districtId && (
        <Badge variant="secondary" className="gap-1">
          {districtName ?? "District"}
          <button onClick={() => setDistrict(null)} aria-label="Clear district">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
