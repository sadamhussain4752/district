"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, LogOut, Menu, Search, Bell, PanelLeftClose,
} from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav";
import { ROLE_LABELS, APP_NAME, CLIENT_NAME } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/misc";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FilterBar } from "./filter-bar";
import { NotificationBell } from "./notification-bell";
import { GlobalSearch } from "./global-search";
import type { MeResponse } from "@/lib/types";

const STORAGE_KEY = "ii_sidebar_collapsed";

export function AppShell({
  me,
  children,
}: {
  me: MeResponse;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);
  React.useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const featureSet = new Set(me.features);
  const items = NAV_ITEMS.filter((i) => featureSet.has(i.feature));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-navy text-navy-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarInner
          items={items}
          collapsed={collapsed}
          pathname={pathname}
        />
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center gap-2 border-t border-white/10 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" /> Collapse
            </>
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-navy p-0 text-navy-foreground">
          <SidebarInner items={items} collapsed={false} pathname={pathname} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:border-primary/40 sm:max-w-sm"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">
                Search beneficiary, house, project, invoice…
              </span>
              <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">
                /
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <NotificationBell initialUnread={me.unreadNotifications} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials(me.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left leading-tight sm:block">
                      <div className="text-sm font-medium">{me.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_LABELS[me.user.role]}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium">{me.user.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {me.user.email}
                    </div>
                    <div className="mt-1 text-xs font-normal text-muted-foreground">
                      {me.user.employeeId}
                      {me.districtName ? ` · ${me.districtName}` : ""}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <LogoutItem />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <FilterBar />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>

        <footer className="border-t px-4 py-3 text-center text-[11px] text-muted-foreground">
          {APP_NAME} · Managed by {CLIENT_NAME} · Authorized Personnel Only
        </footer>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function SidebarInner({
  items,
  collapsed,
  pathname,
}: {
  items: typeof NAV_ITEMS;
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-white/10 px-3",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15 text-sm font-bold">
          II
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-bold">INDIRAMMA ILLU</div>
            <div className="text-[10px] text-white/60">
              Project Management System
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group} className="mb-3">
              {!collapsed && (
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group}
                </div>
              )}
              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-white/15 font-medium text-white"
                            : "text-white/75 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </>
  );
}

function LogoutItem() {
  const router = useRouter();
  return (
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" /> Sign out
    </DropdownMenuItem>
  );
}
