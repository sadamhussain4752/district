"use client";
import * as React from "react";
import { CURRENT_FY } from "@/lib/constants";

type Filters = {
  fy: string;
  districtId: string | null;
  districtName: string | null;
};

type Ctx = Filters & {
  setFy: (fy: string) => void;
  setDistrict: (id: string | null, name?: string | null) => void;
  reset: () => void;
};

const FiltersContext = React.createContext<Ctx | null>(null);
const KEY = "ii_filters";

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<Filters>({
    fy: CURRENT_FY,
    districtId: null,
    districtName: null,
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFilters((f) => ({ ...f, ...JSON.parse(raw) }));
    } catch {}
  }, []);

  const persist = React.useCallback((next: Filters) => {
    setFilters(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const value: Ctx = {
    ...filters,
    setFy: (fy) => persist({ ...filters, fy }),
    setDistrict: (districtId, districtName = null) =>
      persist({ ...filters, districtId, districtName }),
    reset: () =>
      persist({ fy: CURRENT_FY, districtId: null, districtName: null }),
  };

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = React.useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}

/** Build a query string from the active filters. */
export function useFilterQuery(extra: Record<string, string | number | undefined> = {}) {
  const { fy, districtId } = useFilters();
  const sp = new URLSearchParams();
  if (fy) sp.set("fy", fy);
  if (districtId) sp.set("districtId", districtId);
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}
