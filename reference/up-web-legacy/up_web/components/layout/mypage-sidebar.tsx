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
  Building2,
  Settings,
  Shield,
  User,
  LayoutDashboard,
  Users,
  LogOut,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface UserInfo {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MypageSidebarProps {
  isSystemAdmin?: boolean;
  className?: string;
  user?: UserInfo | null;
}

export function MypageSidebar({
  isSystemAdmin = false,
  className,
  user,
}: MypageSidebarProps) {
  const pathname = usePathname();

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

  const mainNavItems: NavItem[] = [
    {
      title: "ワークスペース",
      href: "/mypage/workspaces",
      icon: Building2,
    },
    {
      title: "プロフィール",
      href: "/mypage/profile",
      icon: User,
    },
    {
      title: "設定",
      href: "/mypage/settings",
      icon: Settings,
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      title: "ダッシュボード",
      href: "/mypage/system-admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: "ユーザー管理",
      href: "/mypage/system-admin/users",
      icon: Users,
    },
    {
      title: "ワークスペース",
      href: "/mypage/system-admin/workspaces",
      icon: Building2,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-background",
        className
      )}
    >
      {/* Logo Header */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎬</span>
          <span className="font-semibold">AD-Agent</span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 py-4">
          {/* Main navigation */}
          <div className="space-y-1">
            <div className="px-3 py-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                マイページ
              </span>
            </div>
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive(item.href, item.exact)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>

          {/* System admin section */}
          {isSystemAdmin && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="px-3 py-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    システム管理
                  </span>
                </div>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive(item.href, item.exact)
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
                  href="/mypage/profile"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <Settings className="h-4 w-4" />
                  プロフィール設定
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
