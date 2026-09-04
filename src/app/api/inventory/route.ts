import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

export const GET = route(
  async ({ req }) => {
    const warehouseId = req.nextUrl.searchParams.get("warehouseId") || undefined;

    const [stock, warehouses] = await Promise.all([
      prisma.inventoryStock.findMany({
        where: warehouseId ? { warehouseId } : {},
        include: {
          material: true,
          warehouse: { select: { id: true, name: true, level: true } },
        },
      }),
      prisma.warehouse.findMany({
        orderBy: { level: "asc" },
        select: { id: true, name: true, level: true },
      }),
    ]);

    // Aggregate per material across warehouses (or filtered warehouse)
    const byMaterial = new Map<string, any>();
    for (const s of stock) {
      const key = s.materialId;
      const entry = byMaterial.get(key) ?? {
        id: key,
        name: s.material.name,
        category: s.material.category,
        unit: s.material.unit,
        reorderLevel: s.material.reorderLevel,
        standardRate: s.material.standardRate,
        quantity: 0,
        value: 0,
      };
      entry.quantity += s.quantity;
      entry.value += s.quantity * s.material.standardRate;
      byMaterial.set(key, entry);
    }

    const items = [...byMaterial.values()].map((m) => ({
      ...m,
      status:
        m.quantity <= m.reorderLevel * 0.4
          ? "CRITICAL"
          : m.quantity <= m.reorderLevel
            ? "LOW"
            : "HEALTHY",
    }));

    const totalValue = items.reduce((a, i) => a + i.value, 0);
    const critical = items.filter((i) => i.status === "CRITICAL").length;
    const low = items.filter((i) => i.status === "LOW").length;

    return NextResponse.json({
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
      warehouses,
      summary: { totalValue, critical, low, healthy: items.length - critical - low },
    });
  },
  { feature: "inventory" },
);
