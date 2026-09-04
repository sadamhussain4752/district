import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { DEPLOY_STATE, CURRENT_FY } from "./constants";
import { nextApplicationNo, nextBeneficiaryCode } from "./sequence";
import { createHouseForBeneficiary } from "./house";
import type { z } from "zod";
import type { beneficiaryCreateSchema } from "./validators";

function hashAadhaar(a: string) {
  return createHash("sha256")
    .update(`${a}:${process.env.JWT_ACCESS_SECRET || "salt"}`)
    .digest("hex");
}

const HOUSE_TRIGGER_STATUSES = new Set([
  "APPROVED", "HOUSE_ALLOTTED", "CONSTRUCTION_NOT_STARTED",
  "CONSTRUCTION_STARTED", "UNDER_CONSTRUCTION", "COMPLETED",
]);

export async function createBeneficiary(
  input: z.infer<typeof beneficiaryCreateSchema>,
  createdBy: string,
) {
  const state = await prisma.state.findFirstOrThrow();
  const stateCode = DEPLOY_STATE === "AP" ? "AP" : "TG";

  const fy = input.financialYear || CURRENT_FY;
  const [beneficiaryCode, applicationNo] = await Promise.all([
    nextBeneficiaryCode(stateCode),
    nextApplicationNo(fy),
  ]);

  const aadhaar = input.aadhaar && input.aadhaar.length === 12 ? input.aadhaar : null;

  return prisma.beneficiary.create({
    data: {
      beneficiaryCode,
      applicationNo,
      name: input.name,
      guardianName: input.guardianName,
      gender: input.gender,
      dob: input.dob ? new Date(input.dob) : null,
      aadhaarLast4: aadhaar ? aadhaar.slice(-4) : null,
      aadhaarHash: aadhaar ? hashAadhaar(aadhaar) : null,
      mobile: input.mobile || null,
      altMobile: input.altMobile || null,
      bankAccountLast4: input.bankAccount ? input.bankAccount.slice(-4) : null,
      bankAccountEnc: input.bankAccount || null,
      ifsc: input.ifsc || null,
      bankName: input.bankName || null,
      address: input.address,
      stateId: state.id,
      districtId: input.districtId,
      mandalId: input.mandalId,
      villageId: input.villageId,
      pinCode: input.pinCode,
      latitude: input.latitude,
      longitude: input.longitude,
      scheme: input.scheme || "Indiramma Illu",
      financialYear: fy,
      sanctionNo: input.sanctionNo,
      sanctionDate: input.sanctionDate ? new Date(input.sanctionDate) : null,
      sanctionAmount: input.sanctionAmount || 0,
      houseType: input.houseType,
      plotDetails: input.plotDetails,
      landOwnership: input.landOwnership,
      projectId: input.projectId || null,
      status: "APPLIED",
      createdBy,
    },
  });
}

/** When a beneficiary reaches an approved-family status, ensure a house exists. */
export async function maybeCreateHouse(beneficiaryId: string, status: string) {
  if (HOUSE_TRIGGER_STATUSES.has(status)) {
    await createHouseForBeneficiary(beneficiaryId);
  }
}
