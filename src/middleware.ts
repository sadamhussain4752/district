import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { NAV_ITEMS } from "@/lib/nav";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "dev-access-secret",
);
const ACCESS_COOKIE = "ii_at";
const PUBLIC_PATHS = ["/login", "/forgot-password"];

// Minimal role→feature map mirrored from src/lib/rbac.ts (edge-safe subset).
const ROLE_FEATURES: Record<string, string[] | "*"> = {
  SUPER_ADMIN: "*",
  STATE_ADMIN: "*",
  DISTRICT_MANAGER: [
    "dashboard", "command-center", "executive-mis", "map", "beneficiaries",
    "projects", "construction", "daily-progress", "contractors", "supervisors",
    "labour", "inventory", "material-requests", "purchases", "expenses", "funds",
    "payments", "quality", "issues", "approvals", "reports", "documents",
  ],
  PROJECT_MANAGER: [
    "dashboard", "map", "beneficiaries", "projects", "construction",
    "daily-progress", "contractors", "supervisors", "labour", "inventory",
    "material-requests", "expenses", "payments", "quality", "issues",
    "approvals", "reports", "documents",
  ],
  SITE_ENGINEER: [
    "dashboard", "construction", "daily-progress", "labour", "material-requests",
    "quality", "issues", "documents",
  ],
  CONTRACTOR: [
    "dashboard", "construction", "daily-progress", "material-requests",
    "payments", "issues", "documents",
  ],
  LABOUR_VENDOR: ["dashboard", "labour", "issues"],
  STORE_MANAGER: ["dashboard", "inventory", "material-requests", "purchases", "reports"],
  ACCOUNTS: [
    "dashboard", "executive-mis", "expenses", "funds", "payments",
    "contractors", "reports", "approvals", "documents",
  ],
  AUDITOR: [
    "dashboard", "command-center", "executive-mis", "map", "beneficiaries",
    "projects", "construction", "reports", "documents", "audit",
  ],
};

function featureForPath(pathname: string): string | null {
  const seg = "/" + (pathname.split("/")[1] || "");
  const item = NAV_ITEMS.find((i) => i.href === seg);
  return item?.feature ?? null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = req.cookies.get(ACCESS_COOKIE)?.value;

  let payload: Record<string, unknown> | null = null;
  if (token) {
    try {
      payload = (await jwtVerify(token, ACCESS_SECRET)).payload as Record<
        string,
        unknown
      >;
    } catch {
      payload = null;
    }
  }

  if (isPublic) {
    if (payload) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!payload) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const feature = featureForPath(pathname);
  if (feature) {
    const allowed = ROLE_FEATURES[payload.role as string];
    if (allowed !== "*" && !(allowed || []).includes(feature)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
