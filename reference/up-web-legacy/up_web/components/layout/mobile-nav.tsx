"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Cog,
  FolderOpen,
  Home,
  Menu,
  Plus,
  Tv,
  Users,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import type { Program, WorkspaceRole } from "@/lib/types";

interface UserInfo {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MobileNavProps {
  workspaceSlug: string;
  workspaceName?: string;
  workspaceLogoUrl?: string | null;
  programs?: Program[];
  userRole?: WorkspaceRole;
  user?: UserInfo | null;
}

export function MobileNav({
  workspaceSlug,
  workspaceName,
  workspaceLogoUrl,
  programs = [],
  userRole = "member",
  user,
}: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">メニュー</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-left">
            {workspaceLogoUrl ? (
              <img
                src={workspaceLogoUrl}
                alt={workspaceName || workspaceSlug}
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <span className="text-xl">🏢</span>
            )}
            <span className="truncate">{workspaceName || workspaceSlug}</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="space-y-4 py-4 px-3">
            {/* Main navigation */}
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
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
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 pl-6 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
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
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 pl-6 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
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
          <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-3">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(user.display_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {user.display_name || "ユーザー"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Link
                href="/mypage"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  マイページ
                </Button>
              </Link>
              <Link
                href="/mypage/settings"
                onClick={() => setOpen(false)}
              >
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <form action="/auth/logout" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
