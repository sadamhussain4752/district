"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Download, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states";
import { formatNumber } from "@/lib/utils";
import {
  MandalClaimDialog, PaymentDialog, type ChartVendor, type MandalClaim,
} from "./chart-dialogs";

const STAGES = ["augerCount", "blCount", "rlCount", "rcCount", "compCount"] as const;
const STAGE_HEADS = ["Auger", "BL", "RL", "RC", "COMP"];
/** Per-house labour rate from the sheet's "Rate" row (RC / COMP are blank there). */
const RATES: (number | null)[] = [2000, 12000, 22000, null, null];

const money = (v: number) => (v ? formatNumber(v) : "");
const count = (v: number) => (v ? formatNumber(v) : "0");

/** The Labour_Payment Details sheet, rendered as it looks in Excel. */
export type { ChartVendor };

export function LabourPaymentChart() {
  const [editClaim, setEditClaim] = React.useState<{ vendor: ChartVendor; claim: MandalClaim | null } | null>(null);
  const [editPayment, setEditPayment] = React.useState<ChartVendor | null>(null);

  const { data, isLoading } = useQuery<{ data: ChartVendor[] }>({
    queryKey: ["labour-chart"],
    queryFn: () => fetch("/api/labour?pageSize=200&sort=name&dir=asc").then((r) => r.json()),
  });

  // Only contractors that appear in the payment chart, biggest claim first.
  const vendors = React.useMemo(
    () =>
      (data?.data ?? [])
        .filter((v) => v.mandalClaims.length || v.claimAmount)
        .sort((a, b) => b.claimAmount - a.claimAmount),
    [data],
  );

  const grand = React.useMemo(() => {
    const t = { auger: 0, bl: 0, rl: 0, rc: 0, comp: 0, claim: 0, tds: 0, net: 0, paid: 0, balance: 0 };
    for (const v of vendors) {
      t.auger += v.augerCount; t.bl += v.blCount; t.rl += v.rlCount;
      t.rc += v.rcCount; t.comp += v.compCount;
      t.claim += v.claimAmount; t.tds += v.tdsAmount; t.net += v.netPayable;
      t.paid += v.paidAmount; t.balance += v.balanceAmount;
    }
    return t;
  }, [vendors]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["Labour_Name", "Mandal", ...STAGE_HEADS, "Total", "TDS@1%", "Net Payble", "Paid Amount", "Balance"],
    ];
    for (const v of vendors) {
      v.mandalClaims.forEach((c, i) => {
        rows.push([
          i === 0 ? v.name : "", c.mandalName,
          ...STAGES.map((s) => c[s]),
          ...(i === 0 ? [v.claimAmount, v.tdsAmount, v.netPayable, v.paidAmount, v.balanceAmount] : ["", "", "", "", ""]),
        ]);
      });
      rows.push([`${v.name}_Total`, "", ...STAGES.map((s) => v[s]), "", "", "", "", ""]);
    }
    rows.push(["Net_Total", "", grand.auger, grand.bl, grand.rl, grand.rc, grand.comp, grand.claim, grand.tds, grand.net, grand.paid, grand.balance]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "labour-payment-chart.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Skeleton className="h-[480px] w-full" />;
  if (!vendors.length)
    return <EmptyState title="No labour payment chart" description="Import the Labour_Payment Details sheet to populate this view." />;

  const num = "border px-2 py-1 text-right tabular-nums";
  const txt = "border px-2 py-1";

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Labour_Payment_Chart · All-Site</h3>
            <p className="text-xs text-muted-foreground">
              Mandal-wise houses per contractor, exactly as the workbook sheet lays it out
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60">
                <th className={`${txt} text-left`} rowSpan={2}>Labour_Name</th>
                <th className={`${txt} text-left`}>Rate</th>
                {RATES.map((r, i) => (
                  <th key={STAGE_HEADS[i]} className={num}>{r ? formatNumber(r) : ""}</th>
                ))}
                <th className={txt} colSpan={6}></th>
              </tr>
              <tr className="bg-muted/60">
                <th className={`${txt} text-left`}>Mandal</th>
                {STAGE_HEADS.map((h) => <th key={h} className={num}>{h}</th>)}
                <th className={num}>Total</th>
                <th className={num}>TDS@1%</th>
                <th className={num}>Net Payble</th>
                <th className={num}>Paid Amount</th>
                <th className={num}>Balance</th>
                <th className={`${txt} w-10`}></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <React.Fragment key={v.id}>
                  {v.mandalClaims.map((c, i) => (
                    <tr
                      key={c.id}
                      className="cursor-pointer hover:bg-accent/40"
                      title="Double-click to edit this mandal row"
                      onDoubleClick={() => setEditClaim({ vendor: v, claim: c })}
                    >
                      <td className={`${txt} font-medium`}>
                        {i === 0 ? (
                          <Link href={`/construction?labourVendorId=${v.id}`} className="text-primary hover:underline">
                            {v.name}
                          </Link>
                        ) : ""}
                      </td>
                      <td className={txt}>{c.mandalName}</td>
                      {STAGES.map((s) => <td key={s} className={num}>{count(c[s])}</td>)}
                      {i === 0 ? (
                        <>
                          <td
                            className={`${num} cursor-pointer hover:bg-accent/60`}
                            rowSpan={v.mandalClaims.length}
                            title="Double-click to edit the payment figures"
                            onDoubleClick={(e) => { e.stopPropagation(); setEditPayment(v); }}
                          >
                            {money(v.claimAmount)}
                          </td>
                          <td className={num} rowSpan={v.mandalClaims.length}>{money(v.tdsAmount)}</td>
                          <td className={num} rowSpan={v.mandalClaims.length}>{money(v.netPayable)}</td>
                          <td className={num} rowSpan={v.mandalClaims.length}>{money(v.paidAmount)}</td>
                          <td className={num} rowSpan={v.mandalClaims.length}>{money(v.balanceAmount)}</td>
                          <td className={`${txt} text-center`} rowSpan={v.mandalClaims.length}>
                            <button
                              className="text-muted-foreground hover:text-foreground"
                              title={`Edit payment figures for ${v.name}`}
                              aria-label={`Edit payment figures for ${v.name}`}
                              onClick={() => setEditPayment(v)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                  <tr className="bg-success/15 font-semibold">
                    <td className={txt}>{v.name}_Total</td>
                    <td className={txt}></td>
                    {STAGES.map((s) => <td key={s} className={num}>{count(v[s])}</td>)}
                    <td className={num} colSpan={5}></td>
                    <td className={`${txt} text-center`}>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        title={`Add a mandal row for ${v.name}`}
                        aria-label={`Add a mandal row for ${v.name}`}
                        onClick={() => setEditClaim({ vendor: v, claim: null })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-success/30 font-bold">
                <td className={txt}>Net_Total</td>
                <td className={txt}></td>
                <td className={num}>{formatNumber(grand.auger)}</td>
                <td className={num}>{formatNumber(grand.bl)}</td>
                <td className={num}>{formatNumber(grand.rl)}</td>
                <td className={num}>{formatNumber(grand.rc)}</td>
                <td className={num}>{formatNumber(grand.comp)}</td>
                <td className={num}>{formatNumber(grand.claim)}</td>
                <td className={num}>{formatNumber(grand.tds)}</td>
                <td className={num}>{formatNumber(grand.net)}</td>
                <td className={num}>{formatNumber(grand.paid)}</td>
                <td className={num}>{formatNumber(grand.balance)}</td>
                <td className={txt}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Double-click a mandal row to edit its stage counts, or the money block to edit the payment
          figures. Use + on a contractor&apos;s total row to add a mandal.
        </p>

        <MandalClaimDialog
          vendor={editClaim?.vendor ?? null}
          claim={editClaim?.claim ?? null}
          open={!!editClaim}
          onClose={() => setEditClaim(null)}
        />
        <PaymentDialog vendor={editPayment} onClose={() => setEditPayment(null)} />
      </CardContent>
    </Card>
  );
}
