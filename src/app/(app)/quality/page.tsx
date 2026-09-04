import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/states";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Quality Inspection"
        description="Stage-wise quality checklists, scoring and rework tracking"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Quality Inspection" }]}
      />
      <ComingSoon feature="Quality Inspection" />
    </div>
  );
}
