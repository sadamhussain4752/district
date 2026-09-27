import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, route, writeAudit, clientIp } from "@/lib/api";
import { nextCode } from "@/lib/sequence";

export const POST = route(async ({ req, user, params }) => {
  const order = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, include: { items: true, grns: true } });
  if (!order) throw new HttpError(404, "Purchase order not found");
  if (!order.warehouseId) throw new HttpError(422, "Purchase order has no inventory location");
  if (["RECEIVED", "CLOSED"].includes(order.status) || order.grns.length) throw new HttpError(409, "This purchase has already been received");
  const grn = await prisma.grn.create({ data: {
    grnNo: await nextCode("GRN", "goods-receipt"), poId: order.id, supplierId: order.supplierId, warehouseId: order.warehouseId,
    invoiceNo: order.invoiceNo, vehicleNo: order.vehicleNo, qcStatus: "VERIFIED",
    items: { create: order.items.map((item) => ({ materialId: item.materialId, orderedQty: item.quantity, receivedQty: item.quantity, acceptedQty: item.quantity })) },
  } });
  for (const item of order.items) {
    const current = await prisma.inventoryStock.findUnique({ where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: order.warehouseId } } });
    const balanceAfter = (current?.quantity ?? 0) + item.quantity;
    await prisma.inventoryStock.upsert({
      where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: order.warehouseId } },
      create: { materialId: item.materialId, warehouseId: order.warehouseId, quantity: item.quantity, value: item.amount },
      update: { quantity: { increment: item.quantity }, value: { increment: item.amount } },
    });
    await prisma.stockTransaction.create({ data: { txnNo: await nextCode("STK", "stock-transaction"), type: "PURCHASE_RECEIPT", materialId: item.materialId, warehouseId: order.warehouseId, quantity: item.quantity, balanceAfter, purpose: `Received against ${order.poNo}`, reference: grn.grnNo } });
  }
  const updated = await prisma.purchaseOrder.update({ where: { id: order.id }, data: { status: "RECEIVED" } });
  await writeAudit({ user, action: "UPDATE", module: "purchases", recordId: order.id, oldValue: order, newValue: updated, reason: `Received as ${grn.grnNo}`, ip: clientIp(req) });
  return NextResponse.json({ order: updated, grn });
}, { feature: "purchases", write: true });
