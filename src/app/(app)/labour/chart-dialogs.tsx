"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";

export type MandalClaim = {
  id: string; mandalName: string;
  augerCount: number; blCount: number; rlCount: number; rcCount: number; compCount: number;
};
export type ChartVendor = {
  id: string; name: string;
  augerCount: number; blCount: number; rlCount: number; rcCount: number; compCount: number;
  claimAmount: number; tdsAmount: number; netPayable: number; paidAmount: number; balanceAmount: number;
  mandalClaims: MandalClaim[];
};

const STAGE_FIELDS = [
  ["augerCount", "Auger"], ["blCount", "BL"], ["rlCount", "RL"],
  ["rcCount", "RC"], ["compCount", "COMP"],
] as const;

function useChartMutation(vendorId: string | undefined, onDone: () => void, verb: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) =>
      fetch(`/api/labour/${vendorId}/chart`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Update failed");
        return r.json();
      }),
    onSuccess: () => {
      toast.success(verb);
      qc.invalidateQueries({ queryKey: ["labour-chart"] });
      qc.invalidateQueries({ queryKey: ["labour-payments"] });
      qc.invalidateQueries({ queryKey: ["labour-totals"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

/** Edit (or add) one mandal row of a contractor's payment chart. */
export function MandalClaimDialog({
  vendor, claim, open, onClose,
}: {
  vendor: ChartVendor | null;
  claim: MandalClaim | null; // null + open = add a new mandal row
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const mut = useChartMutation(vendor?.id, onClose, claim ? "Mandal row updated" : "Mandal row added");
  const del = useChartMutation(vendor?.id, onClose, "Mandal row removed");

  React.useEffect(() => {
    if (!open) return;
    setForm({
      mandalName: claim?.mandalName ?? "",
      ...Object.fromEntries(STAGE_FIELDS.map(([f]) => [f, String(claim?.[f] ?? 0)])),
    });
  }, [open, claim]);

  const total = STAGE_FIELDS.reduce((a, [f]) => a + (Number(form[f]) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {claim ? `Edit ${claim.mandalName}` : "Add mandal row"} · {vendor?.name}
          </DialogTitle>
          <DialogDescription>
            Houses done per stage. The contractor&apos;s stage totals are recalculated from these rows.
          </DialogDescription>
        </DialogHeader>
        <form
          id="claim-form"
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate({ claim: { id: claim?.id, ...form } });
          }}
        >
          <div className="sm:col-span-3">
            <Field label="Mandal">
              <Input required value={form.mandalName ?? ""} onChange={(e) => set("mandalName")(e.target.value)} />
            </Field>
          </div>
          {STAGE_FIELDS.map(([f, label]) => (
            <Field key={f} label={label}>
              <Input
                type="number" min="0" step="1" inputMode="numeric"
                value={form[f] ?? "0"} onChange={(e) => set(f)(e.target.value)}
              />
            </Field>
          ))}
          <p className="text-xs text-muted-foreground sm:col-span-3">Total houses in this mandal: {total}</p>
        </form>
        <DialogFooter className="sm:justify-between">
          {claim ? (
            <Button
              variant="ghost" className="text-destructive"
              disabled={del.isPending || mut.isPending}
              onClick={() => del.mutate({ deleteClaimId: claim.id })}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Remove row
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancel</Button>
            <Button type="submit" form="claim-form" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {claim ? "Save" : "Add"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Edit a contractor's Total / TDS / Net Payable / Paid figures. */
export function PaymentDialog({
  vendor, onClose,
}: {
  vendor: ChartVendor | null;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const mut = useChartMutation(vendor?.id, onClose, "Payment figures updated");

  React.useEffect(() => {
    if (!vendor) return;
    setForm({
      claimAmount: String(vendor.claimAmount ?? 0),
      tdsAmount: String(vendor.tdsAmount ?? 0),
      netPayable: String(vendor.netPayable ?? 0),
      paidAmount: String(vendor.paidAmount ?? 0),
    });
  }, [vendor]);

  const gross = Number(form.claimAmount) || 0;
  const net = Number(form.netPayable) || 0;
  const paid = Number(form.paidAmount) || 0;
  const balance = Math.max(0, net - paid);
  const overpaid = paid > net;

  return (
    <Dialog open={!!vendor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment figures · {vendor?.name}</DialogTitle>
          <DialogDescription>Balance is calculated as net payable minus paid.</DialogDescription>
        </DialogHeader>
        <form
          id="payment-form"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate({ payment: form });
          }}
        >
          <Field label="Total (gross ₹)">
            <Input type="number" min="0" step="1" required value={form.claimAmount ?? ""} onChange={(e) => set("claimAmount")(e.target.value)} />
          </Field>
          <Field label="TDS @ 1% (₹)">
            <Input type="number" min="0" step="1" required value={form.tdsAmount ?? ""} onChange={(e) => set("tdsAmount")(e.target.value)} />
          </Field>
          <Field label="Net payable (₹)">
            <Input type="number" min="0" step="1" required value={form.netPayable ?? ""} onChange={(e) => set("netPayable")(e.target.value)} />
          </Field>
          <Field label="Paid amount (₹)">
            <Input type="number" min="0" step="1" required value={form.paidAmount ?? ""} onChange={(e) => set("paidAmount")(e.target.value)} />
          </Field>
          <div className="sm:col-span-2 flex items-center justify-between text-xs">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() =>
                setForm((f) => {
                  const g = Number(f.claimAmount) || 0;
                  const tds = Math.round(g * 0.01);
                  return { ...f, tdsAmount: String(tds), netPayable: String(g - tds) };
                })
              }
            >
              Recalculate TDS &amp; net from ₹{gross.toLocaleString("en-IN")}
            </button>
            <span className={overpaid ? "text-destructive" : "text-muted-foreground"}>
              {overpaid ? "Paid is more than net payable." : `Balance ${formatINR(balance)}`}
            </span>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancel</Button>
          <Button type="submit" form="payment-form" disabled={mut.isPending || overpaid}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
