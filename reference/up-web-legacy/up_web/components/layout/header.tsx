"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Shield,
  User as UserIcon,
} from "lucide-react";
import type { Workspace } from "@/lib/types";

// Simplified user type for header display (avoid requiring all User fields)
interface HeaderUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_system_admin: boolean;
}

interface HeaderProps {
  user: HeaderUser | null;
  currentWorkspace?: Workspace | null;
  workspaces?: Workspace[];
  showWorkspaceSelector?: boolean;
}

export function Header({
  user,
  currentWorkspace,
  workspaces = [],
  showWorkspaceSelector = false,
}: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile menu button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">メニュー</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[350px]">
            <nav className="flex flex-col gap-4 mt-4">
              {currentWorkspace && (
                <>
                  <Link
                    href={`/${currentWorkspace.slug}/dashboard`}
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ダッシュボード
                  </Link>
                  <Link
                    href={`/${currentWorkspace.slug}/programs`}
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    番組
                  </Link>
                </>
              )}
              <Link
                href="/mypage"
                className="text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                マイページ
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <span className="text-xl">🎬</span>
          <span className="font-semibold hidden sm:inline-block">AD-Agent</span>
        </Link>

        {/* Workspace selector */}
        {showWorkspaceSelector && currentWorkspace && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1 text-sm font-medium">
                {currentWorkspace.name}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((ws) => (
                <DropdownMenuItem key={ws.id} asChild>
                  <Link href={`/${ws.slug}/dashboard`}>
                    {ws.name}
                    {ws.id === currentWorkspace.id && " ✓"}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/mypage">すべてのワークスペース</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 gap-2 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.avatar_url || undefined}
                    alt={user.display_name || "User"}
                  />
                  <AvatarFallback>
                    {getInitials(user.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium">
                  {user.display_name || user.email}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.avatar_url || undefined}
                    alt={user.display_name || "User"}
                  />
                  <AvatarFallback>
                    {getInitials(user.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.display_name || "ユーザー"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/mypage/profile">
                  <UserIcon className="mr-2 h-4 w-4" />
                  プロフィール
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/mypage/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  設定
                </Link>
              </DropdownMenuItem>
              {user.is_system_admin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/mypage/system-admin">
                      <Shield className="mr-2 h-4 w-4" />
                      システム管理
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action="/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">ログイン</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/sign-up">新規登録</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
