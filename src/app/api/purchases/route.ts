import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, clientIp } from "@/lib/api";
import { nextCode } from "@/lib/sequence";

const createSchema = z.object({
  supplierId: z.string().optional(), supplierName: z.string().trim().min(2).optional(),
  warehouseId: z.string().min(1), invoiceNo: z.string().trim().optional(), vehicleNo: z.string().trim().optional(),
  materialId: z.string().optional(),
  newMaterial: z.object({ name: z.string().trim().min(2), category: z.string().trim().min(2), unit: z.string().trim().min(1) }).optional(),
  quantity: z.coerce.number().positive(), rate: z.coerce.number().nonnegative(),
});

export const GET = route(async () => {
  const [orders, suppliers, warehouses, materials] = await Promise.all([
    prisma.purchaseOrder.findMany({ include: { items: true, grns: true }, orderBy: { poDate: "desc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }), prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
    prisma.material.findMany({ orderBy: { name: "asc" } }),
  ]);
  const supplierMap = new Map(suppliers.map((item) => [item.id, item.name]));
  const warehouseMap = new Map(warehouses.map((item) => [item.id, item.name]));
  const materialMap = new Map(materials.map((item) => [item.id, item.name]));
  const rows = orders.map((order) => ({ ...order,
    supplierName: order.supplierId ? supplierMap.get(order.supplierId) ?? "Unknown supplier" : "—",
    warehouseName: order.warehouseId ? warehouseMap.get(order.warehouseId) ?? "Unknown location" : "—",
    itemSummary: order.items.map((item) => `${materialMap.get(item.materialId) ?? "Product"} · ${item.quantity} ${item.unit}`).join(", "),
    grnNo: order.grns[0]?.grnNo ?? null,
  }));
  return NextResponse.json({ rows, suppliers, warehouses, materials, summary: {
    orders: rows.length, orderedAmount: rows.reduce((sum, row) => sum + row.total, 0),
    pending: rows.filter((row) => !["RECEIVED", "CLOSED"].includes(row.status)).length,
    received: rows.filter((row) => ["RECEIVED", "CLOSED"].includes(row.status)).length,
  } });
}, { feature: "purchases" });

export const POST = route(async ({ req, user }) => {
  const body = createSchema.parse(await req.json());
  if (!body.supplierId && !body.supplierName) return NextResponse.json({ error: "Select a supplier or enter a new supplier name" }, { status: 422 });
  if (!body.materialId && !body.newMaterial) return NextResponse.json({ error: "Select a product or enter a new product" }, { status: 422 });
  const supplier = body.supplierId ? await prisma.supplier.findUnique({ where: { id: body.supplierId } }) : await prisma.supplier.create({ data: { code: await nextCode("VEN", "supplier"), name: body.supplierName! } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  const material = body.materialId ? await prisma.material.findUnique({ where: { id: body.materialId } }) : await prisma.material.create({ data: { materialCode: await nextCode("MAT", "material"), name: body.newMaterial!.name, category: body.newMaterial!.category, unit: body.newMaterial!.unit, standardRate: body.rate } });
  if (!material) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const amount = body.quantity * body.rate;
  const order = await prisma.purchaseOrder.create({ data: {
    poNo: await nextCode("PO", "purchase-order"), supplierId: supplier.id, warehouseId: body.warehouseId, status: "ORDERED",
    subTotal: amount, total: amount, invoiceNo: body.invoiceNo || null, vehicleNo: body.vehicleNo || null,
    items: { create: { materialId: material.id, quantity: body.quantity, unit: material.unit, rate: body.rate, amount } },
  }, include: { items: true } });
  await writeAudit({ user, action: "CREATE", module: "purchases", recordId: order.id, newValue: order, ip: clientIp(req) });
  return NextResponse.json(order, { status: 201 });
}, { feature: "purchases", write: true });
