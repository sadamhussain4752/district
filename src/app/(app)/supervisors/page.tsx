import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/states";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Supervisors"
        description="Supervisor master — assigned sites, tasks and site-visit tracking"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Supervisors" }]}
      />
      <ComingSoon feature="Supervisor management" />
    </div>
  );
}
