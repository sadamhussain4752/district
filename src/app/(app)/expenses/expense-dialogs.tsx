"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatINR, formatDate } from "@/lib/utils";

export type ExpenseRow = {
  id: string;
  expenseCode: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  gst: number;
  vendor: string | null;
  paidBy: string | null;
  paymentMode: string | null;
  reference: string | null;
  remarks: string | null;
  districtId: string | null;
  mandalId: string | null;
  districtName: string | null;
  mandalName: string | null;
  status: string;
};

const STATUSES = [
  ["DRAFT", "Draft"],
  ["SUBMITTED", "Submitted"],
  ["PM_APPROVED", "PM Approved"],
  ["ACCOUNTS_APPROVED", "Accounts Approved"],
  ["PAID", "Paid"],
  ["REJECTED", "Rejected"],
] as const;
const MODES = ["Bank Transfer", "PhonePe", "Site Cash", "Cash", "Cheque", "UPI", "Card"];
const NONE = "__none";

async function send(url: string, method: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Request failed");
  return r.json();
}

function useInvalidateExpenses() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expenses-summary"] });
  };
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Add / edit form. `open` with no `expense` = add a new one; with an `expense` = edit it.
 */
export function ExpenseFormDialog({
  open,
  expense,
  categories,
  onClose,
}: {
  open: boolean;
  expense?: ExpenseRow | null;
  categories: string[];
  onClose: () => void;
}) {
  const isNew = !expense;
  const invalidate = useInvalidateExpenses();
  const [form, setForm] = React.useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  React.useEffect(() => {
    if (!open) return;
    if (!expense) {
      setForm({ date: today(), category: "", amount: "", status: "PAID", paymentMode: "Site Cash" });
      return;
    }
    setForm({
      date: expense.date.slice(0, 10),
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description ?? "",
      vendor: expense.vendor ?? "",
      paidBy: expense.paidBy ?? "",
      paymentMode: expense.paymentMode ?? "",
      reference: expense.reference ?? "",
      remarks: expense.remarks ?? "",
      districtId: expense.districtId ?? "",
      mandalId: expense.mandalId ?? "",
      status: expense.status,
    });
  }, [open, expense]);

  const { data: districts = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["districts-list"],
    queryFn: () => fetch("/api/locations/districts").then((r) => (r.ok ? r.json() : [])),
    enabled: open,
  });
  const { data: mandals = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["mandals-list", form.districtId],
    queryFn: () =>
      fetch(`/api/locations/mandals?districtId=${form.districtId}`).then((r) => (r.ok ? r.json() : [])),
    enabled: open && !!form.districtId,
  });

  const mut = useMutation({
    mutationFn: () =>
      isNew ? send("/api/expenses", "POST", form) : send(`/api/expenses/${expense!.id}`, "PATCH", form),
    onSuccess: (saved: { expenseCode: string }) => {
      toast.success(`${saved.expenseCode} ${isNew ? "added" : "updated"}`);
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modes = form.paymentMode && !MODES.includes(form.paymentMode) ? [form.paymentMode, ...MODES] : MODES;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "New expense" : `Edit expense ${expense.expenseCode}`}</DialogTitle>
          <DialogDescription>
            {isNew
              ? "Gets the next EXM- number. Re-importing the Excel workbook never touches these."
              : "Changes are recorded in the audit log."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="expense-form"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <Field label="Date">
            <Input type="date" required value={form.date ?? ""} onChange={(e) => set("date")(e.target.value)} />
          </Field>
          <Field label="Amount (₹)">
            <Input
              type="number" step="0.01" min="0.01" required inputMode="decimal"
              value={form.amount ?? ""} onChange={(e) => set("amount")(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <Input
              list="expense-categories" required placeholder="e.g. Diesel, Cement, Labour"
              value={form.category ?? ""} onChange={(e) => set("category")(e.target.value)}
            />
            <datalist id="expense-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={set("status")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={form.description ?? ""} onChange={(e) => set("description")(e.target.value)} />
          </Field>
          <Field label="Vendor">
            <Input value={form.vendor ?? ""} onChange={(e) => set("vendor")(e.target.value)} />
          </Field>
          <Field label="Paid by">
            <Input value={form.paidBy ?? ""} onChange={(e) => set("paidBy")(e.target.value)} />
          </Field>
          <Field label="Payment mode">
            <Select value={form.paymentMode || NONE} onValueChange={(v) => set("paymentMode")(v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {modes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Chq / Ref No.">
            <Input value={form.reference ?? ""} onChange={(e) => set("reference")(e.target.value)} />
          </Field>
          <Field label="District">
            <Select
              value={form.districtId || NONE}
              onValueChange={(v) => setForm((f) => ({ ...f, districtId: v === NONE ? "" : v, mandalId: "" }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mandal">
            <Select
              value={form.mandalId || NONE}
              onValueChange={(v) => set("mandalId")(v === NONE ? "" : v)}
              disabled={!form.districtId}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {mandals.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Remarks" className="sm:col-span-2">
            <Input value={form.remarks ?? ""} onChange={(e) => set("remarks")(e.target.value)} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancel</Button>
          <Button type="submit" form="expense-form" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isNew ? "Add expense" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteExpenseDialog({
  expense,
  onClose,
}: {
  expense: ExpenseRow | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidateExpenses();
  const mut = useMutation({
    mutationFn: () => send(`/api/expenses/${expense!.id}`, "DELETE"),
    onSuccess: () => {
      toast.success(`${expense!.expenseCode} deleted`);
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!expense} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete expense {expense?.expenseCode}?</DialogTitle>
          <DialogDescription>
            {expense && (
              <>
                {formatINR(expense.amount)} · {expense.category} · {formatDate(expense.date)}
                {expense.vendor ? ` · ${expense.vendor}` : ""}
                <br />
                This removes it from all totals. A copy is kept in the audit log.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancel</Button>
          <Button variant="destructive" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
