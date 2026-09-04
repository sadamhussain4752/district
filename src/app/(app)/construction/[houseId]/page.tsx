"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Camera, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/states";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate, formatDateTime, pct } from "@/lib/utils";
import { STAGE_STATUS_LABELS } from "@/lib/constants";

function F({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default function HouseDetailPage() {
  const { houseId } = useParams<{ houseId: string }>();
  const qc = useQueryClient();
  const [editStage, setEditStage] = React.useState<any | null>(null);

  const { data: h, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["house", houseId],
    queryFn: () => fetch(`/api/houses/${houseId}`).then((r) => r.json()),
  });

  const stageMutation = useMutation({
    mutationFn: (payload: any) =>
      fetch(`/api/houses/${houseId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Update failed");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Stage updated · house progress recalculated");
      setEditStage(null);
      qc.invalidateQueries({ queryKey: ["house", houseId] });
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
  if (isError || h?.error)
    return <ErrorState message={h?.error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`House ${h.houseCode}`}
        description={h.beneficiary?.name}
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Construction", href: "/construction" },
          { label: h.houseCode },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/beneficiaries/${h.beneficiaryId}`}>
              Beneficiary 360° <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <F label="Beneficiary" value={`${h.beneficiary?.name} (${h.beneficiary?.beneficiaryCode})`} />
          <F label="District / Mandal / Village" value={`${h.beneficiary?.district?.name} / ${h.beneficiary?.mandal?.name} / ${h.beneficiary?.village?.name}`} />
          <F label="Contractor" value={h.contractor?.companyName} />
          <F label="Project Manager" value={h.projectManager?.name} />
          <F label="Engineer" value={h.engineer?.name} />
          <F label="Supervisor" value={h.supervisor?.name} />
          <F label="Status" value={<StatusBadge status={h.status} />} />
          <F label="Schedule Health" value={<StatusBadge status={h.scheduleHealth} />} />
          <div className="lg:col-span-2">
            <dt className="text-xs text-muted-foreground">Overall Completion</dt>
            <dd className="mt-1 flex items-center gap-3">
              <Progress value={h.progressPct} className="h-2.5" />
              <span className="text-sm font-bold tabular-nums">{pct(h.progressPct)}</span>
            </dd>
          </div>
          <F label="Health Score" value={<><span className="font-bold">{h.healthScore}</span>/100 <StatusBadge status={h.healthBand} className="ml-1" /></>} />
          <F label="Est. / Actual Cost" value={`${formatINR(h.estimatedCost)} / ${formatINR(h.actualCost)}`} />
          {h.delayReason && (
            <div className="lg:col-span-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-warning">
                <TriangleAlert className="h-4 w-4" /> Delay: {h.delayReason}
              </div>
              <p className="text-xs text-muted-foreground">
                Responsible: {h.delayResponsible ?? "—"} · Planned completion {formatDate(h.plannedCompletion)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="stages">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="stages">Construction Stages</TabsTrigger>
          <TabsTrigger value="dpr">Daily Progress</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="photos">Site Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <Card>
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Progress</TableHead>
                    <TableHead>Actual Start</TableHead>
                    <TableHead className="text-right">Stage Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {h.stageProgress.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{s.sequence}</TableCell>
                      <TableCell className="font-medium">{s.stageName}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={s.progressPct} className="h-1.5" />
                          <span className="w-9 text-right text-xs tabular-nums">{s.progressPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(s.actualStart)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(s.stageCost)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditStage(s)}
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dpr">
          {h.dprs?.length ? (
            <Card><CardContent className="pt-5">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Stage</TableHead>
                  <TableHead>Today's Work</TableHead>
                  <TableHead className="text-right">% Today</TableHead>
                  <TableHead className="text-right">Labour</TableHead>
                  <TableHead>Weather</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {h.dprs.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{formatDate(d.date)}</TableCell>
                      <TableCell>{d.stageKey}</TableCell>
                      <TableCell className="text-sm">{d.todaysWork}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.pctToday}%</TableCell>
                      <TableCell className="text-right tabular-nums">{d.labourCount}</TableCell>
                      <TableCell className="text-xs">{d.weatherImpact}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : <EmptyState title="No daily progress reports yet" />}
        </TabsContent>

        <TabsContent value="quality">
          {h.inspections?.length ? (
            <Card><CardContent className="space-y-2 pt-5">
              {h.inspections.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{q.stageKey} · {q.inspectionNo}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(q.inspectionDate)} · Score {q.score}</div>
                  </div>
                  <StatusBadge status={q.result} />
                </div>
              ))}
            </CardContent></Card>
          ) : <EmptyState title="No quality inspections recorded" />}
        </TabsContent>

        <TabsContent value="materials">
          {h.consumption?.length ? (
            <Card><CardContent className="pt-5">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Material</TableHead><TableHead>Stage</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Issued</TableHead>
                  <TableHead className="text-right">Consumed</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {h.consumption.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name ?? c.materialId}</TableCell>
                      <TableCell>{c.stageKey}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.expectedQty}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.issuedQty}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.consumedQty}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.varianceQty > 0 ? (
                          <Badge variant={c.flagged ? "destructive" : "warning"}>+{c.varianceQty}</Badge>
                        ) : c.varianceQty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(c.materialCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : <EmptyState title="No material consumption recorded" />}
        </TabsContent>

        <TabsContent value="payments">
          {h.payments?.length ? (
            <Card><CardContent className="pt-5">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="text-right">Eligible</TableHead>
                  <TableHead className="text-right">Released</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid On</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {h.payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.milestone}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(p.eligibleAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(p.releasedAmount)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-xs">{formatDate(p.paymentDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : <EmptyState title="No payment milestones" />}
        </TabsContent>

        <TabsContent value="issues">
          {h.issues?.length ? (
            <Card><CardContent className="space-y-2 pt-5">
              {h.issues.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{i.category}</div>
                    <div className="text-xs text-muted-foreground">{i.issueCode} · due {formatDate(i.dueDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={i.priority} />
                    <StatusBadge status={i.status} />
                  </div>
                </div>
              ))}
            </CardContent></Card>
          ) : <EmptyState title="No issues raised for this house" />}
        </TabsContent>

        <TabsContent value="photos">
          {h.photos?.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {h.photos.map((p: any) => (
                <div key={p.id} className="overflow-hidden rounded-md border">
                  <img src={p.url} alt={p.description || ""} className="aspect-video w-full object-cover" />
                  <div className="p-2 text-xs">
                    <div className="font-medium">{p.stageKey} · {p.photoType}</div>
                    <div className="text-muted-foreground">{formatDateTime(p.takenAt || p.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Camera}
              title="No site photographs uploaded"
              description="Field engineers upload geo-tagged before / during / after photos for each stage from the mobile interface."
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editStage} onOpenChange={(o) => !o && setEditStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update stage — {editStage?.stageName}</DialogTitle>
          </DialogHeader>
          {editStage && (
            <StageForm
              stage={editStage}
              onSubmit={(payload) =>
                stageMutation.mutate({ stageKey: editStage.stageKey, ...payload })
              }
              pending={stageMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StageForm({
  stage,
  onSubmit,
  pending,
}: {
  stage: any;
  onSubmit: (payload: any) => void;
  pending: boolean;
}) {
  const [status, setStatus] = React.useState(stage.status);
  const [progress, setProgress] = React.useState(String(stage.progressPct));
  const [cost, setCost] = React.useState(String(stage.stageCost || ""));
  const [remarks, setRemarks] = React.useState(stage.remarks || "");

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Progress %</Label>
            <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Stage Cost (₹)</Label>
            <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Remarks</Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note" />
        </div>
        <p className="text-xs text-muted-foreground">
          Completing a quality-checkpoint stage requires a passed inspection. House
          completion % is recalculated automatically from all stage weights.
        </p>
      </div>
      <DialogFooter className="mt-4">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          disabled={pending}
          onClick={() =>
            onSubmit({
              status,
              progressPct: Number(progress),
              stageCost: cost ? Number(cost) : undefined,
              remarks: remarks || undefined,
            })
          }
        >
          Save update
        </Button>
      </DialogFooter>
    </>
  );
}
