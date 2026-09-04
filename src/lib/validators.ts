import { z } from "zod";

export const beneficiaryCreateSchema = z.object({
  name: z.string().min(3),
  guardianName: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  dob: z.string().optional(),
  aadhaar: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar must be 12 digits")
    .optional()
    .or(z.literal("")),
  mobile: z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile").optional().or(z.literal("")),
  altMobile: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
  bankName: z.string().optional(),
  address: z.string().optional(),
  districtId: z.string().min(1, "District is required"),
  mandalId: z.string().min(1, "Mandal is required"),
  villageId: z.string().min(1, "Village is required"),
  pinCode: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  scheme: z.string().optional(),
  financialYear: z.string().optional(),
  sanctionNo: z.string().optional(),
  sanctionDate: z.string().optional(),
  sanctionAmount: z.coerce.number().min(0).optional(),
  houseType: z.string().optional(),
  plotDetails: z.string().optional(),
  landOwnership: z.string().optional(),
  projectId: z.string().optional(),
});

export const beneficiaryUpdateSchema = beneficiaryCreateSchema.partial().extend({
  status: z
    .enum([
      "APPLIED", "VERIFICATION_PENDING", "VERIFIED", "REJECTED", "APPROVED",
      "HOUSE_ALLOTTED", "CONSTRUCTION_NOT_STARTED", "CONSTRUCTION_STARTED",
      "UNDER_CONSTRUCTION", "COMPLETED", "ON_HOLD", "CANCELLED",
    ])
    .optional(),
  contractorId: z.string().optional(),
  projectManagerId: z.string().optional(),
});

export const projectCreateSchema = z.object({
  name: z.string().min(3),
  districtId: z.string().min(1),
  mandalId: z.string().optional(),
  villageId: z.string().optional(),
  financialYear: z.string().min(1),
  plannedHouses: z.coerce.number().int().min(0),
  approvedBudget: z.coerce.number().min(0),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  projectManagerId: z.string().optional(),
  contractorId: z.string().optional(),
});

export const stageUpdateSchema = z.object({
  stageKey: z.string().min(1),
  status: z
    .enum([
      "NOT_STARTED", "STARTED", "IN_PROGRESS", "PENDING_VERIFICATION",
      "VERIFIED", "COMPLETED", "REJECTED", "REWORK_REQUIRED",
    ])
    .optional(),
  progressPct: z.coerce.number().min(0).max(100).optional(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  remarks: z.string().optional(),
  stageCost: z.coerce.number().min(0).optional(),
});
