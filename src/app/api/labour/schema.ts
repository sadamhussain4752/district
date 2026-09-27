import { z } from "zod";

export const labourSchema = z.object({
  name: z.string().trim().min(2),
  contactPhone: z.string().trim().optional(),
  trade: z.string().trim().optional(),
  contractorId: z.string().trim().optional(),
  districtId: z.string().trim().optional(),
  mandalId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  supervisorId: z.string().trim().optional(),
  workerCount: z.coerce.number().int().min(0),
  rateType: z.enum(["DAILY", "CONTRACT", "QUANTITY"]).optional().or(z.literal("")),
});
