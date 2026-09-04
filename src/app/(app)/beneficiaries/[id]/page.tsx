"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/states";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate, pct } from "@/lib/utils";
import { BENEFICIARY_STATUS_LABELS } from "@/lib/constants";

const STATUS_FLOW = Object.keys(BENEFICIARY_STATUS_LABELS);

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default function BeneficiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["beneficiary", id],
    queryFn: () => fetch(`/api/beneficiaries/${id}`).then((r) => r.json()),
  });

  const mutation = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/beneficiaries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Update failed");
      }),
    onSuccess: () => {
      toast.success("Beneficiary status updated");
      qc.invalidateQueries({ queryKey: ["beneficiary", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (isError || data?.error)
    return <ErrorState message={data?.error} onRetry={() => refetch()} />;

  const b = data;
  const house = b.house;

  return (
    <div className="space-y-5">
      <PageHeader
        title={b.name}
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Beneficiaries", href: "/beneficiaries" },
          { label: b.beneficiaryCode },
        ]}
        actions={
          <Select
            value={b.status}
            onValueChange={(v) => mutation.mutate(v)}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FLOW.map((s) => (
                <SelectItem key={s} value={s}>
                  {BENEFICIARY_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Header summary */}
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Beneficiary ID" value={b.beneficiaryCode} />
          <Field label="Application No" value={b.applicationNo} />
          <Field label="District / Mandal / Village" value={`${b.district?.name} / ${b.mandal?.name} / ${b.village?.name}`} />
          <Field label="Overall Status" value={<StatusBadge status={b.status} />} />
          <Field label="Assigned Contractor" value={b.contractor?.companyName} />
          <Field label="Project Manager" value={b.projectManager?.name} />
          <Field
            label="Current Stage"
            value={house?.currentStageName ?? "House not created"}
          />
          <div>
            <dt className="text-xs text-muted-foreground">Completion</dt>
            <dd className="mt-1 flex items-center gap-2">
              <Progress value={house?.progressPct ?? 0} className="h-2" />
              <span className="text-sm font-semibold tabular-nums">
                {pct(house?.progressPct ?? 0)}
              </span>
            </dd>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal Details</TabsTrigger>
          <TabsTrigger value="house">House Information</TabsTrigger>
          <TabsTrigger value="progress">Construction Progress</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Government Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Field label="Scheme" value={b.scheme} />
                <Field label="Financial Year" value={b.financialYear} />
                <Field label="Sanction No" value={b.sanctionNo} />
                <Field label="Sanction Date" value={formatDate(b.sanctionDate)} />
                <Field label="Sanction Amount" value={formatINR(b.sanctionAmount)} />
                <Field label="House Type" value={b.houseType} />
                <Field label="Land Ownership" value={b.landOwnership} />
                <Field label="Plot Details" value={b.plotDetails} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Location</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Field label="Address" value={b.address} />
                <Field label="PIN Code" value={b.pinCode} />
                <Field label="District" value={b.district?.name} />
                <Field label="Mandal" value={b.mandal?.name} />
                <Field label="Village" value={b.village?.name} />
                <Field
                  label="Geo Location"
                  value={
                    b.latitude
                      ? `${b.latitude.toFixed(4)}, ${b.longitude?.toFixed(4)}`
                      : "—"
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Personal &amp; Bank Details</CardTitle>
              {!b.canViewSensitive && (
                <Badge variant="warning" className="gap-1">
                  <ShieldAlert className="h-3 w-3" /> Sensitive data masked for your role
                </Badge>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full Name" value={b.name} />
              <Field label="Father / Husband" value={b.guardianName} />
              <Field label="Gender" value={b.gender} />
              <Field label="Date of Birth" value={formatDate(b.dob)} />
              <Field label="Mobile" value={b.mobile} />
              <Field label="Alternate Mobile" value={b.altMobile} />
              <Field label="Aadhaar Number" value={b.aadhaarDisplay} />
              <Field label="Bank Account" value={b.bankAccountDisplay} />
              <Field label="IFSC" value={b.ifsc} />
              <Field label="Bank Name" value={b.bankName} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="house">
          {house ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>House {house.houseCode}</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/construction/${house.id}`}>
                    Open construction file <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="House ID" value={house.houseCode} />
                <Field label="Status" value={<StatusBadge status={house.status} />} />
                <Field label="Schedule Health" value={<StatusBadge status={house.scheduleHealth} />} />
                <Field label="Health Score" value={`${house.healthScore}/100`} />
                <Field label="Start Date" value={formatDate(house.startDate)} />
                <Field label="Planned Completion" value={formatDate(house.plannedCompletion)} />
                <Field label="Estimated Cost" value={formatINR(house.estimatedCost)} />
                <Field label="Actual Cost" value={formatINR(house.actualCost)} />
                {house.delayReason && (
                  <Field label="Delay Reason" value={house.delayReason} />
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="House not created yet"
              description="A house construction file is created automatically once the beneficiary reaches Approved status."
            />
          )}
        </TabsContent>

        <TabsContent value="progress">
          {house?.stageProgress?.length ? (
            <Card>
              <CardContent className="pt-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40">Progress</TableHead>
                      <TableHead className="text-right">Stage Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {house.stageProgress.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {s.sequence}
                        </TableCell>
                        <TableCell className="font-medium">{s.stageName}</TableCell>
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={s.progressPct} className="h-1.5" />
                            <span className="w-9 text-right text-xs tabular-nums">
                              {s.progressPct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(s.stageCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState title="No construction stages" description="Stages appear once the house file is created." />
          )}
        </TabsContent>

        <TabsContent value="payments">
          {b.payments?.length ? (
            <Card>
              <CardContent className="pt-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Milestone</TableHead>
                      <TableHead className="text-right">Eligible</TableHead>
                      <TableHead className="text-right">Released</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Txn Ref</TableHead>
                      <TableHead>Paid On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b.payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.milestone[0] + p.milestone.slice(1).toLowerCase()} Payment
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(p.eligibleAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(p.releasedAmount)}
                        </TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-xs">{p.txnRef || "—"}</TableCell>
                        <TableCell className="text-xs">{formatDate(p.paymentDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState title="No payment milestones" />
          )}
        </TabsContent>

        <TabsContent value="documents">
          {b.documents?.length ? (
            <Card>
              <CardContent className="space-y-2 pt-5">
                {b.documents.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{d.docType}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No documents uploaded"
              description="Aadhaar, application form, agreement, bank proof, land documents and the completion certificate are managed here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
