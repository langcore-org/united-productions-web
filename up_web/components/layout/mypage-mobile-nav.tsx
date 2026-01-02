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
  Building2,
  Settings,
  Shield,
  User,
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Menu,
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

interface MypageMobileNavProps {
  isSystemAdmin?: boolean;
  user?: UserInfo | null;
}

export function MypageMobileNav({
  isSystemAdmin = false,
  user,
}: MypageMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
    {
      title: "請求管理",
      href: "/mypage/system-admin/billing",
      icon: CreditCard,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

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
            <span className="text-xl">🎬</span>
            <span>AD-Agent</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="space-y-4 py-4 px-3">
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
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
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
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
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
            <form action="/auth/logout" method="POST" className="mt-2">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
