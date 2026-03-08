"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Building2,
  Users,
  FolderKanban,
} from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  memberCount: number;
  programCount: number;
  created_at: string;
  updated_at: string;
}

interface WorkspacesTableProps {
  workspaces: Workspace[];
  totalCount: number;
}

export function WorkspacesTable({
  workspaces,
  totalCount,
}: WorkspacesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWorkspaces = workspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            ワークスペース管理
          </h1>
          <p className="text-muted-foreground">
            システム内のワークスペースを管理します
          </p>
        </div>
        <Button>
          <Building2 className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ワークスペース一覧</CardTitle>
          <CardDescription>
            登録ワークスペース: {totalCount}件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="名前またはスラッグで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ワークスペース</TableHead>
                  <TableHead>メンバー</TableHead>
                  <TableHead>番組数</TableHead>
                  <TableHead>作成日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkspaces.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      {searchQuery
                        ? "検索結果がありません"
                        : "ワークスペースがありません"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkspaces.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-md">
                            <AvatarImage src={ws.logo_url || undefined} />
                            <AvatarFallback className="rounded-md">
                              {getInitials(ws.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{ws.name}</p>
                            <p className="text-sm text-muted-foreground">
                              /{ws.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {ws.memberCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          {ws.programCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(ws.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
