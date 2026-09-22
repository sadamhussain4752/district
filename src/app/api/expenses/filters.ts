import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api";

/** Shared where-clause for the expense list + summary endpoints. */
export function expenseWhere(req: NextRequest, q?: string) {
  const sp = req.nextUrl.searchParams;
  const and: Record<string, unknown>[] = [];
  if (q)
    and.push({
      OR: ["expenseCode", "vendor", "category", "description", "paidBy", "reference"].map((f) => ({
        [f]: { contains: q, mode: "insensitive" },
      })),
    });
  if (sp.get("status")) and.push({ status: sp.get("status") });
  if (sp.get("districtId")) and.push({ districtId: sp.get("districtId") });
  if (sp.get("category")) and.push({ category: sp.get("category") });
  if (sp.get("paidBy")) and.push({ paidBy: sp.get("paidBy") });
  // Imported codes: PAY-xxxx = vendor payments, EXP-xxxx = site expenses.
  const source = sp.get("source");
  if (source === "vendor") and.push({ expenseCode: { startsWith: "PAY-" } });
  if (source === "site") and.push({ NOT: { expenseCode: { startsWith: "PAY-" } } });
  return and.length ? { AND: and } : {};
}

const optText = z.string().trim().max(500).nullish().transform((v) => v || null);
const optId = z.string().nullish().transform((v) => v || null);

/** Body for creating / editing an expense. */
export const expenseSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .transform((v) => new Date(`${v}T00:00:00.000Z`)),
  category: z.string().trim().min(1, "Category is required").max(80),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: optText,
  vendor: optText,
  paidBy: optText,
  paymentMode: optText,
  reference: optText,
  remarks: optText,
  districtId: optId,
  mandalId: optId,
  status: z.enum(["DRAFT", "SUBMITTED", "PM_APPROVED", "ACCOUNTS_APPROVED", "REJECTED", "PAID"]),
});

/** Keep district consistent with the chosen mandal. */
export async function resolveLocation(body: { districtId: string | null; mandalId: string | null }) {
  if (!body.mandalId) return { districtId: body.districtId, mandalId: null };
  const mandal = await prisma.mandal.findUnique({ where: { id: body.mandalId } });
  if (!mandal) throw new HttpError(422, "Unknown mandal");
  return { districtId: mandal.districtId, mandalId: mandal.id };
}
