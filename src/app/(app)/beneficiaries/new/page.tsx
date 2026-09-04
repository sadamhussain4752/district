"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { beneficiaryCreateSchema } from "@/lib/validators";
import { FINANCIAL_YEARS, CURRENT_FY } from "@/lib/constants";
import type { z } from "zod";

type FormValues = z.infer<typeof beneficiaryCreateSchema>;

function useLocations() {
  const districts = useQuery<any[]>({
    queryKey: ["loc-districts"],
    queryFn: () => fetch("/api/locations/districts").then((r) => r.json()),
  });
  return { districts };
}

export default function NewBeneficiaryPage() {
  const router = useRouter();
  const { districts } = useLocations();

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(beneficiaryCreateSchema),
    defaultValues: { financialYear: CURRENT_FY, scheme: "Indiramma Illu" },
  });

  const districtId = watch("districtId");
  const mandalId = watch("mandalId");

  const mandals = useQuery<any[]>({
    queryKey: ["loc-mandals", districtId],
    queryFn: () =>
      fetch(`/api/locations/mandals?districtId=${districtId}`).then((r) => r.json()),
    enabled: !!districtId,
  });
  const villages = useQuery<any[]>({
    queryKey: ["loc-villages", mandalId],
    queryFn: () =>
      fetch(`/api/locations/villages?mandalId=${mandalId}`).then((r) => r.json()),
    enabled: !!mandalId,
  });

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Could not create beneficiary");
      return;
    }
    const { id } = await res.json();
    toast.success("Beneficiary registered");
    router.push(`/beneficiaries/${id}`);
  }

  return (
    <div>
      <PageHeader
        title="Register Beneficiary"
        description="Create a new housing beneficiary application record"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Beneficiaries", href: "/beneficiaries" },
          { label: "New" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldInput label="Beneficiary Name *" error={errors.name?.message} {...register("name")} />
            <FieldInput label="Father / Husband Name" {...register("guardianName")} />
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select onValueChange={(v) => setValue("gender", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FieldInput label="Date of Birth" type="date" {...register("dob")} />
            <FieldInput label="Aadhaar Number" error={errors.aadhaar?.message} placeholder="12 digits" {...register("aadhaar")} />
            <FieldInput label="Mobile Number" error={errors.mobile?.message} placeholder="10 digits" {...register("mobile")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldInput label="Bank Account Number" {...register("bankAccount")} />
            <FieldInput label="IFSC" {...register("ifsc")} />
            <FieldInput label="Bank Name" {...register("bankName")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>District *</Label>
              <Select onValueChange={(v) => { setValue("districtId", v); setValue("mandalId", ""); setValue("villageId", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                <SelectContent>
                  {districts.data?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.districtId && <p className="text-xs text-destructive">{errors.districtId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mandal *</Label>
              <Select
                disabled={!districtId}
                value={mandalId || ""}
                onValueChange={(v) => { setValue("mandalId", v); setValue("villageId", ""); }}
              >
                <SelectTrigger><SelectValue placeholder="Select mandal" /></SelectTrigger>
                <SelectContent>
                  {mandals.data?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mandalId && <p className="text-xs text-destructive">{errors.mandalId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Village *</Label>
              <Select
                disabled={!mandalId}
                value={watch("villageId") || ""}
                onValueChange={(v) => setValue("villageId", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select village" /></SelectTrigger>
                <SelectContent>
                  {villages.data?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.villageId && <p className="text-xs text-destructive">{errors.villageId.message}</p>}
            </div>
            <FieldInput label="Address" {...register("address")} />
            <FieldInput label="PIN Code" {...register("pinCode")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Government / Sanction</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Financial Year</Label>
              <Select defaultValue={CURRENT_FY} onValueChange={(v) => setValue("financialYear", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>FY {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FieldInput label="Sanction Number" {...register("sanctionNo")} />
            <FieldInput label="Sanction Date" type="date" {...register("sanctionDate")} />
            <FieldInput label="Sanction Amount (₹)" type="number" {...register("sanctionAmount")} />
            <FieldInput label="House Type" placeholder="e.g. G+0 (2BHK)" {...register("houseType")} />
            <FieldInput label="Land Ownership" {...register("landOwnership")} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Register Beneficiary
          </Button>
        </div>
      </form>
    </div>
  );
}

const FieldInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { label: string; error?: string }
>(({ label, error, ...props }, ref) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input ref={ref} {...props} />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
FieldInput.displayName = "FieldInput";
