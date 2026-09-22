import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, clientIp, HttpError } from "@/lib/api";
import { expenseSchema, resolveLocation } from "../filters";

async function load(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } }).catch(() => null);
  if (!expense) throw new HttpError(404, "Expense not found");
  return expense;
}

export const PATCH = route(
  async ({ params, req, user }) => {
    const before = await load(params.id);
    const body = expenseSchema.parse(await req.json());
    const updated = await prisma.expense.update({
      where: { id: before.id },
      data: { ...body, ...(await resolveLocation(body)) },
    });
    await writeAudit({
      user,
      action: "UPDATE",
      module: "expenses",
      recordId: updated.expenseCode,
      oldValue: before,
      newValue: updated,
      ip: clientIp(req),
    });
    return NextResponse.json(updated);
  },
  { feature: "expenses", write: true },
);

export const DELETE = route(
  async ({ params, req, user }) => {
    const before = await load(params.id);
    await prisma.expense.delete({ where: { id: before.id } });
    await writeAudit({
      user,
      action: "DELETE",
      module: "expenses",
      recordId: before.expenseCode,
      oldValue: before,
      ip: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  },
  { feature: "expenses", write: true },
);
