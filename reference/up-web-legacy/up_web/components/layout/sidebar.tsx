"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Cog,
  FolderOpen,
  Home,
  Plus,
  Tv,
  Users,
  FileText,
  User,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react";
import type { Program, WorkspaceRole } from "@/lib/types";

interface UserInfo {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SidebarProps {
  workspaceSlug: string;
  workspaceName?: string;
  workspaceLogoUrl?: string | null;
  programs?: Program[];
  userRole?: WorkspaceRole;
  className?: string;
  user?: UserInfo | null;
}

export function Sidebar({
  workspaceSlug,
  workspaceName,
  workspaceLogoUrl,
  programs = [],
  userRole = "member",
  className,
  user,
}: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = userRole === "owner" || userRole === "admin";

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const mainNavItems = [
    {
      title: "ダッシュボード",
      href: `/${workspaceSlug}/dashboard`,
      icon: Home,
    },
  ];

  const adminNavItems = [
    {
      title: "ワークスペース設定",
      href: `/${workspaceSlug}/settings`,
      icon: Cog,
    },
    {
      title: "メンバー管理",
      href: `/${workspaceSlug}/members`,
      icon: Users,
    },
    {
      title: "Google Drive",
      href: `/${workspaceSlug}/settings/drive`,
      icon: FolderOpen,
    },
  ];

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-background",
        className
      )}
    >
      {/* Workspace Header */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/${workspaceSlug}/dashboard`} className="flex items-center gap-2 truncate">
          {workspaceLogoUrl ? (
            <img
              src={workspaceLogoUrl}
              alt={workspaceName || workspaceSlug}
              className="h-6 w-6 rounded object-cover"
            />
          ) : (
            <span className="text-xl">🏢</span>
          )}
          <span className="font-semibold truncate">{workspaceName || workspaceSlug}</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 py-4">
          {/* Main navigation */}
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>

          {/* Programs section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                📺 番組
              </span>
            </div>
            {programs.length > 0 ? (
              programs.map((program) => (
                <Link
                  key={program.id}
                  href={`/${workspaceSlug}/programs/${program.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 pl-6 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname.includes(program.id)
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <Tv className="h-4 w-4" />
                  <span className="truncate">{program.name}</span>
                </Link>
              ))
            ) : (
              <p className="px-3 py-2 pl-6 text-sm text-muted-foreground">
                番組がありません
              </p>
            )}
            <Link
              href={`/${workspaceSlug}/programs/new`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 pl-6 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="h-4 w-4" />
              新しい番組
            </Link>
          </div>

          {/* Admin section */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-1">
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* User section at bottom */}
      {user && (
        <div className="border-t p-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(user.display_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="font-medium truncate">
                    {user.display_name || "ユーザー"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start" side="top">
              <div className="space-y-1">
                <Link
                  href="/mypage"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <User className="h-4 w-4" />
                  マイページ
                </Link>
                <Link
                  href="/mypage/settings"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <Settings className="h-4 w-4" />
                  設定
                </Link>
                <Separator className="my-1" />
                <form action="/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    ログアウト
                  </button>
                </form>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </aside>
  );
}
