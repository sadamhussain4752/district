import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/states";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Labour Vendors"
        description="Labour vendor master, daily attendance and quantity claims"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Labour Vendors" }]}
      />
      <ComingSoon feature="Labour Vendors" />
    </div>
  );
}
