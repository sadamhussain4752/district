import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { APP_NAME, CLIENT_NAME } from "@/lib/constants";
import { ShieldCheck, Building2, HardHat } from "lucide-react";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy p-4">
      {/* Infrastructure backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M0 40h120M0 80h120M40 0v120M80 0v120'/%3E%3Crect x='16' y='56' width='24' height='24'/%3E%3Crect x='56' y='16' width='24' height='24'/%3E%3Crect x='80' y='80' width='24' height='24'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl"
      />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl md:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-navy to-primary p-9 text-white md:flex">
          <div>
            <div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70">
              <ShieldCheck className="h-4 w-4" /> Government Project Portal
            </div>
            <h1 className="text-3xl font-bold leading-tight">INDIRAMMA ILLU</h1>
            <p className="mt-2 text-sm text-white/80">
              Beneficiary &amp; Project Management System
            </p>
            <div className="mt-8 space-y-4 text-sm text-white/85">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-white/70" />
                <span>
                  State &rarr; District &rarr; Mandal &rarr; Village &rarr;
                  Beneficiary &rarr; House level monitoring
                </span>
              </div>
              <div className="flex items-start gap-3">
                <HardHat className="mt-0.5 h-5 w-5 shrink-0 text-white/70" />
                <span>
                  Stage-wise construction, materials, finance &amp; quality
                  tracking in one command centre
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-white/60">
            Managed by
            <div className="mt-1 text-sm font-semibold text-white">
              {CLIENT_NAME}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-6 md:hidden">
            <h1 className="text-xl font-bold text-navy">INDIRAMMA ILLU</h1>
            <p className="text-sm text-muted-foreground">
              Beneficiary &amp; Project Management System
            </p>
          </div>
          <h2 className="text-lg font-semibold">Sign in to continue</h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Use your Employee ID or official email address.
          </p>
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
          <p className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
            Authorized Personnel Only · Secure Government Project Management
            Portal
            <br />
            Public registration is disabled. Accounts are provisioned by
            administrators.
          </p>
        </div>
      </div>
      <p className="absolute bottom-4 z-10 text-center text-[11px] text-white/50">
        {APP_NAME} · {CLIENT_NAME}
      </p>
    </div>
  );
}
