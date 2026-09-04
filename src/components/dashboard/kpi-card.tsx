import Link from "next/link";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
  href,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "navy";
  href?: string;
  loading?: boolean;
}) {
  const toneClass = {
    default: "border-l-primary",
    success: "border-l-success",
    warning: "border-l-warning",
    destructive: "border-l-destructive",
    navy: "border-l-navy",
  }[tone];

  const inner = (
    <div
      className={cn(
        "h-full rounded-lg border border-l-4 bg-card p-4 shadow-sm transition-shadow",
        toneClass,
        href && "hover:shadow-md",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
          {value}
        </p>
      )}
      {sub && !loading && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
