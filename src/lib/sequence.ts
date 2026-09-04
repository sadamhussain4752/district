import { prisma } from "./prisma";

/** Atomically increment and return the next value for a named counter. */
export async function nextSeq(key: string): Promise<number> {
  const counter = await prisma.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}

const pad = (n: number, len = 5) => String(n).padStart(len, "0");

export async function nextBeneficiaryCode(stateCode: string) {
  const n = await nextSeq("beneficiary");
  return `II-${stateCode}-BEN-${pad(n, 6)}`;
}

export async function nextApplicationNo(fy: string) {
  const n = await nextSeq(`application-${fy}`);
  return `APP/${fy}/${pad(n, 6)}`;
}

export async function nextHouseCode(stateCode: string, districtCode: string) {
  const n = await nextSeq(`house-${districtCode}`);
  return `II-${stateCode}-${districtCode}-${pad(n, 6)}`;
}

export async function nextProjectCode(districtCode: string) {
  const n = await nextSeq(`project-${districtCode}`);
  return `PRJ-${districtCode}-${pad(n, 3)}`;
}

export async function nextCode(prefix: string, key: string, len = 5) {
  const n = await nextSeq(key);
  return `${prefix}-${pad(n, len)}`;
}
