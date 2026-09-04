import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/states";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Purchases & GRN"
        description="Purchase orders, supplier delivery and goods receipt notes"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Purchases & GRN" }]}
      />
      <ComingSoon feature="Purchases & GRN" />
    </div>
  );
}
