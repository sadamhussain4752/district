import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/states";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Documents"
        description="Document repository with verification workflow across all entities"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Documents" }]}
      />
      <ComingSoon feature="Documents" />
    </div>
  );
}
