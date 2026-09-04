import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Compact Indian currency: ₹1.2 Cr / ₹4.5 L / ₹9,999 */
export function formatINRCompact(value: number | null | undefined): string {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${inrFmt.format(Math.round(n))}`;
}

export function formatINR(value: number | null | undefined): string {
  return `₹${inrFmt.format(Math.round(Number(value || 0)))}`;
}

export function formatNumber(value: number | null | undefined): string {
  return inrFmt.format(Math.round(Number(value || 0)));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** Mask an Aadhaar number to XXXX XXXX 1234 given the last 4 digits. */
export function maskAadhaar(last4: string | null | undefined): string {
  if (!last4) return "—";
  return `XXXX XXXX ${last4}`;
}

export function maskAccount(last4: string | null | undefined): string {
  if (!last4) return "—";
  return `••••••${last4}`;
}

export function pct(value: number | null | undefined, digits = 1): string {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}
