import Link from "next/link";
import type { Metadata } from "next";
import { CLIENT_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl">
        <h1 className="text-lg font-semibold">Password Assistance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For security reasons, passwords for this portal are reset only by an
          authorized administrator. Please contact your District Project Office or
          the State Administrator with your Employee ID.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Managed by {CLIENT_NAME}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
