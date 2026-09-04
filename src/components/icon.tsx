import {
  LayoutDashboard, Radar, FileBarChart, Map, Users, FolderKanban,
  Building2, ClipboardList, HardHat, UserCog, Hammer, Package, PackagePlus,
  ShoppingCart, Receipt, Landmark, IndianRupee, BadgeCheck, TriangleAlert,
  CheckCheck, FileSpreadsheet, FolderArchive, ShieldCheck, ScrollText,
  Settings, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Radar, FileBarChart, Map, Users, FolderKanban, Building2,
  ClipboardList, HardHat, UserCog, Hammer, Package, PackagePlus, ShoppingCart,
  Receipt, Landmark, IndianRupee, BadgeCheck, TriangleAlert, CheckCheck,
  FileSpreadsheet, FolderArchive, ShieldCheck, ScrollText, Settings,
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? LayoutDashboard;
  return <Cmp className={className} />;
}
