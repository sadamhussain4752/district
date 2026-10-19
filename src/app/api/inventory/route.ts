import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { MATERIAL_PURCHASE_PRESETS } from "@/lib/constants";

export const GET = route(
  async ({ req }) => {
    const warehouseId = req.nextUrl.searchParams.get("warehouseId") || undefined;

    const [materials, stock, warehouses, purchaseRows, stageReceipts] = await Promise.all([
      prisma.material.findMany({ orderBy: { name: "asc" } }),
      prisma.inventoryStock.findMany({
        where: warehouseId ? { warehouseId } : {},
        include: {
          material: true,
          warehouse: { select: { id: true, name: true, level: true } },
        },
      }),
      prisma.warehouse.findMany({
        orderBy: { level: "asc" },
        select: { id: true, code: true, name: true, level: true },
      }),
      prisma.stockTransaction.count({
        where: {
          type: "PURCHASE_RECEIPT",
          ...(warehouseId ? { warehouseId } : {}),
        },
      }),
      prisma.stockTransaction.findMany({
        where: {
          type: "PURCHASE_RECEIPT",
          stageKey: { not: null },
          ...(warehouseId ? { warehouseId } : {}),
        },
        select: { materialId: true, stageKey: true, quantity: true },
      }),
    ]);

    // Start with every material master so products without a received purchase
    // remain visible as zero instead of disappearing from inventory.
    const byMaterial = new Map<string, any>();
    for (const material of materials) {
      byMaterial.set(material.id, {
        id: material.id,
        name: material.name,
        category: material.category,
        unit: material.unit,
        reorderLevel: material.reorderLevel,
        standardRate: material.standardRate,
        quantity: 0,
        value: 0,
        stageQuantities: { BL: 0, RL: 0, RC: 0, COMP: 0 },
      });
    }
    const materialNames = new Set(materials.map((material) => material.name.trim().toLocaleLowerCase("en-IN")));
    for (const preset of MATERIAL_PURCHASE_PRESETS) {
      if (materialNames.has(preset.name.toLocaleLowerCase("en-IN"))) continue;
      byMaterial.set(`preset:${preset.key}`, {
        id: `preset:${preset.key}`,
        name: preset.name,
        category: preset.category,
        unit: preset.unit,
        reorderLevel: 0,
        standardRate: 0,
        quantity: 0,
        value: 0,
        stageQuantities: { BL: 0, RL: 0, RC: 0, COMP: 0 },
      });
    }
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
        stageQuantities: { BL: 0, RL: 0, RC: 0, COMP: 0 },
      };
      entry.quantity += Math.max(0, s.quantity);
      entry.value += typeof s.value === "number" ? s.value : s.quantity * s.material.standardRate;
      byMaterial.set(key, entry);
    }
    for (const receipt of stageReceipts) {
      const entry = byMaterial.get(receipt.materialId);
      if (!entry || !receipt.stageKey) continue;
      const stageKey = receipt.stageKey === "PC" || receipt.stageKey === "PB" ? "BL" : receipt.stageKey;
      if (!(stageKey in entry.stageQuantities)) continue;
      entry.stageQuantities[stageKey] += receipt.quantity;
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
    const totalQuantity = items.reduce((a, i) => a + i.quantity, 0);
    const critical = items.filter((i) => i.status === "CRITICAL").length;
    const low = items.filter((i) => i.status === "LOW").length;

    return NextResponse.json({
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
      warehouses,
      summary: {
        totalValue,
        totalQuantity,
        purchaseRows,
        materials: items.length,
        locations: warehouseId ? 1 : warehouses.filter((warehouse) => warehouse.code.startsWith("MIU-")).length,
        critical,
        low,
        healthy: items.length - critical - low,
      },
    });
  },
  { feature: "inventory" },
);
