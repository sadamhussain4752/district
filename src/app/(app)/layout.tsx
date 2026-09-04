import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowedFeatures } from "@/lib/rbac";
import { AppShell } from "@/components/app-shell/app-shell";
import { FiltersProvider } from "@/components/app-shell/filters";
import type { MeResponse } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [district, unread] = await Promise.all([
    session.districtId
      ? prisma.district.findUnique({ where: { id: session.districtId } })
      : null,
    prisma.notification.count({
      where: {
        read: false,
        OR: [
          { userId: session.id },
          { role: session.role },
          session.districtId
            ? { districtId: session.districtId }
            : { id: "000000000000000000000000" },
        ],
      },
    }),
  ]);

  const me: MeResponse = {
    user: session,
    districtName: district?.name ?? null,
    features: [...allowedFeatures(session.role)],
    unreadNotifications: unread,
  };

  return (
    <FiltersProvider>
      <AppShell me={me}>{children}</AppShell>
    </FiltersProvider>
  );
}
