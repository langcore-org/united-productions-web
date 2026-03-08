"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout";
import {
  Archive,
  FolderOpen,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  Tv,
  Users,
} from "lucide-react";
import { getPrograms, getWorkspaceBySlug, deleteProgram } from "./actions";
import type { ProgramWithTeams, ProgramStatus } from "@/lib/types";
import { getStorageUrl } from "@/lib/utils";

const statusLabels: Record<ProgramStatus, { label: string; color: string }> = {
  active: { label: "進行中", color: "bg-green-500" },
  archived: { label: "アーカイブ", color: "bg-yellow-500" },
  completed: { label: "完了", color: "bg-blue-500" },
};

export default function ProgramsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [programs, setPrograms] = useState<ProgramWithTeams[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPrograms() {
      setIsLoading(true);
      const workspace = await getWorkspaceBySlug(slug);
      if (workspace) {
        const data = await getPrograms(workspace.id);
        setPrograms(data);
      }
      setIsLoading(false);
    }
    fetchPrograms();
  }, [slug]);

  const filteredPrograms = programs.filter(
    (program) =>
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (program.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (programId: string) => {
    if (!confirm("この番組を削除しますか？この操作は取り消せません。")) {
      return;
    }
    const result = await deleteProgram(programId);
    if (result.success) {
      setPrograms(programs.filter((p) => p.id !== programId));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="番組一覧"
          description="ワークスペース内の番組を管理します"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="番組一覧"
        description="ワークスペース内の番組を管理します"
      />

      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="番組を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/${slug}/programs/new`}>
            <Plus className="mr-2 h-4 w-4" />
            新しい番組
          </Link>
        </Button>
      </div>

      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tv className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">番組がありません</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? "検索条件に一致する番組が見つかりませんでした"
                : "「新しい番組」から最初の番組を作成してください"}
            </p>
            {!searchQuery && (
              <Button asChild className="mt-4">
                <Link href={`/${slug}/programs/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  新しい番組を作成
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              slug={slug}
              onDelete={() => handleDelete(program.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramCard({
  program,
  slug,
  onDelete,
}: {
  program: ProgramWithTeams;
  slug: string;
  onDelete: () => void;
}) {
  const status = statusLabels[program.status];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Cover Image */}
          <div className="flex h-32 sm:h-24 w-full sm:w-32 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
            {program.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getStorageUrl(program.cover_image_url) ?? program.cover_image_url}
                alt={program.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Tv className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${slug}/programs/${program.id}`}
                  className="font-semibold hover:underline line-clamp-1"
                >
                  {program.name}
                </Link>
                {program.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {program.description}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/${slug}/programs/${program.id}/settings`}>
                      <Settings className="mr-2 h-4 w-4" />
                      設定
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${slug}/programs/${program.id}/teams/new`}>
                      <Users className="mr-2 h-4 w-4" />
                      チームを追加
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Archive className="mr-2 h-4 w-4" />
                    アーカイブ
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                チーム: {program.team_count || 0} • セッション: {program.session_count || 0}
              </span>
              {program.google_drive_root_name && (
                <span className="flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{program.google_drive_root_name}</span>
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${status.color}`} />
                {status.label}
              </span>
              {(program.start_date || program.end_date) && (
                <span className="text-muted-foreground text-xs sm:text-sm">
                  期間: {formatDate(program.start_date) || "未設定"} -{" "}
                  {formatDate(program.end_date) || "未設定"}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
