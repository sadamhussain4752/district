import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/states";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Reports & MIS"
        description="Beneficiary, construction, financial and material MIS with export"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Reports & MIS" }]}
      />
      <ComingSoon feature="Reports & MIS" />
    </div>
  );
}
