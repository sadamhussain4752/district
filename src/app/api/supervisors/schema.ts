import { z } from "zod";

export const supervisorSchema = z.object({
  name: z.string().trim().min(2),
  mobile: z.string().trim().optional(),
  contractorId: z.string().trim().optional(),
  districtId: z.string().trim().optional(),
  mandalId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
});
