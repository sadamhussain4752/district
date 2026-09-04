"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/utils";

type Notif = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const { data } = useQuery<{ items: Notif[]; unread: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { items: [], unread: 0 };
      return res.json();
    },
    refetchInterval: 60_000,
    initialData: { items: [], unread: initialUnread },
  });

  const unread = data?.unread ?? initialUnread;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-md p-2 hover:bg-accent" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          <span className="text-xs font-normal text-muted-foreground">
            {unread} unread
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {!data?.items.length && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          )}
          {data?.items.map((n) => (
            <Link
              key={n.id}
              href={n.link || "#"}
              className="block rounded-md px-2 py-2 hover:bg-accent"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-primary"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  {n.body && (
                    <p className="truncate text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
