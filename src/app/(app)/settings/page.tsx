import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoon } from "@/components/states";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, APP_NAME, CLIENT_NAME, DEPLOY_STATE } from "@/lib/constants";

function F({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getSession();
  const district = session?.districtId
    ? await prisma.district.findUnique({ where: { id: session.districtId } })
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Your profile and deployment configuration"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Settings" }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <F label="Name" value={session?.name} />
            <F label="Employee ID" value={session?.employeeId} />
            <F label="Email" value={session?.email} />
            <F label="Role" value={session ? ROLE_LABELS[session.role] : "—"} />
            <F label="Assigned District" value={district?.name} />
            <F label="Assigned Projects" value={session?.projectIds.length || 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Deployment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <F label="Application" value={APP_NAME} />
            <F label="Managed By" value={CLIENT_NAME} />
            <F label="State Configuration" value={DEPLOY_STATE === "TG" ? "Telangana" : "Andhra Pradesh"} />
            <F label="Environment" value={process.env.NODE_ENV} />
          </CardContent>
        </Card>
      </div>

      <ComingSoon feature="Master data configuration (stages, categories, materials, warehouses, financial years)" />
    </div>
  );
}
