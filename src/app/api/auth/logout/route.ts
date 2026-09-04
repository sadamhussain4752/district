import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/api";

export async function POST() {
  const user = await getSession();
  await clearSession();
  if (user) {
    await writeAudit({ user, action: "LOGOUT", module: "auth", recordId: user.id });
  }
  return NextResponse.json({ ok: true });
}
