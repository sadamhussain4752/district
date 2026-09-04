import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/states";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Material Requests"
        description="Supervisor & PM material requisitions with issue workflow"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Material Requests" }]}
      />
      <ComingSoon feature="Material Requests" />
    </div>
  );
}
