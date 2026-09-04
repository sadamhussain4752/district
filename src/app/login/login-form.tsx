"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({
  identifier: z.string().min(3, "Enter your Employee ID or email"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

const DEMO = [
  { role: "Super Admin", id: "ADMIN001" },
  { role: "District Manager", id: "DM-RANGA" },
  { role: "Project Manager", id: "PM-001" },
  { role: "Site Engineer", id: "ENG-014" },
  { role: "Contractor", id: "CON-007" },
  { role: "Accounts", id: "ACC-002" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [showPw, setShowPw] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "", remember: true },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error || "Unable to sign in. Please try again.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="identifier">Username / Employee ID / Email</Label>
        <Input
          id="identifier"
          autoComplete="username"
          placeholder="e.g. ADMIN001"
          {...register("identifier")}
        />
        {errors.identifier && (
          <p className="text-xs text-destructive">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() =>
              setServerError(
                "Password reset is handled by your administrator. Please contact the project office.",
              )
            }
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          {...register("remember")}
        />
        Remember me on this device
      </label>

      {serverError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        Login
      </Button>

      <div className="rounded-md border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Demo accounts — password{" "}
          <code className="rounded bg-background px-1 py-0.5">password123</code>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setValue("identifier", d.id);
                setValue("password", "password123");
              }}
              className={cn(
                "rounded-md border bg-card px-2 py-1 text-xs hover:border-primary hover:text-primary",
              )}
            >
              {d.role}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
