"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  FolderOpen,
  Lightbulb,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Tv,
  Clapperboard,
  Cog,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getProgram, deleteTeam } from "../actions";
import type { ProgramWithTeams, Team, AgentType, ProgramStatus, TeamFileRef } from "@/lib/types";
import { getStorageUrl } from "@/lib/utils";

const agentTypeInfo: Record<AgentType, { label: string; icon: typeof Search; color: string }> = {
  research: { label: "リサーチ", icon: Search, color: "text-blue-500" },
  idea_finder: { label: "ネタ探し", icon: Lightbulb, color: "text-yellow-500" },
  planning: { label: "企画作家", icon: Pencil, color: "text-green-500" },
  structure: { label: "構成作家", icon: Clapperboard, color: "text-purple-500" },
  custom: { label: "カスタム", icon: Cog, color: "text-gray-500" },
};

const statusLabels: Record<ProgramStatus, { label: string; color: string }> = {
  active: { label: "進行中", color: "bg-green-500" },
  archived: { label: "アーカイブ", color: "bg-yellow-500" },
  completed: { label: "完了", color: "bg-blue-500" },
};

export default function ProgramDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const programId = params.programId as string;

  const [program, setProgram] = useState<ProgramWithTeams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchProgram() {
      setIsLoading(true);
      const data = await getProgram(programId);
      setProgram(data);
      setIsLoading(false);
    }
    fetchProgram();
  }, [programId]);

  const handleDeleteTeam = (teamId: string) => {
    setTeamToDelete(teamId);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    setIsDeleting(true);
    const result = await deleteTeam(teamToDelete);
    if (result.success && program) {
      setProgram({
        ...program,
        teams: program.teams?.filter((t) => t.id !== teamToDelete),
        team_count: (program.team_count || 1) - 1,
      });
    }
    setIsDeleting(false);
    setTeamToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tv className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">番組が見つかりません</h3>
            <Button asChild className="mt-4">
              <Link href={`/${slug}/programs`}>番組一覧へ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusLabels[program.status];
  const teams = program.teams || [];

  // Check if program has Google Drive root folder configured
  const hasProgramFolder = !!program.google_drive_root_id;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Program Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-6">
            <div className="flex h-24 w-32 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
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
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{program.name}</h1>
                  {program.description && (
                    <p className="mt-1 text-muted-foreground">
                      {program.description}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${slug}/programs/${program.id}/settings`}>
                    <Settings className="mr-2 h-4 w-4" />
                    設定
                  </Link>
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {program.google_drive_root_name ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <FolderOpen className="h-4 w-4" />
                    {program.google_drive_root_name}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    ルートフォルダが設定されていません
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${status.color}`} />
                  {status.label}
                </span>
                {(program.start_date || program.end_date) && (
                  <span className="text-muted-foreground">
                    期間: {formatDate(program.start_date) || "未設定"} -{" "}
                    {formatDate(program.end_date) || "未設定"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">チーム一覧</CardTitle>
          {hasProgramFolder ? (
            <Button size="sm" asChild>
              <Link href={`/${slug}/programs/${program.id}/teams/new`}>
                <Plus className="mr-2 h-4 w-4" />
                新しいチーム
              </Link>
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" disabled className="cursor-not-allowed">
                    <Plus className="mr-2 h-4 w-4" />
                    新しいチーム
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>チームを作成するにはルートフォルダを設定してください</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 font-medium">チームがありません</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasProgramFolder
                  ? "「新しいチーム」からチームを作成してください"
                  : "チームを作成するには、まず設定からルートフォルダを設定してください"}
              </p>
            </div>
          ) : (
            teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                slug={slug}
                programId={program.id}
                onDelete={() => handleDeleteTeam(team.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Delete Team Confirmation Modal */}
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>チームを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。チームに関連するすべてのセッションとデータが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTeam}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                "削除する"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeamCard({
  team,
  slug,
  programId,
  onDelete,
}: {
  team: Team & { session_count?: number; file_refs?: TeamFileRef[] };
  slug: string;
  programId: string;
  onDelete: () => void;
}) {
  const agentInfo = agentTypeInfo[team.agent_type];
  const IconComponent = agentInfo.icon;

  // Check if team folder (file_refs) and output folder are set
  const hasTeamFolder = team.file_refs && team.file_refs.length > 0;
  const hasOutputFolder = !!team.output_directory_id;
  const canOpenChat = hasTeamFolder && hasOutputFolder;

  // Build tooltip message for missing folders
  const getMissingFoldersMessage = () => {
    const missing: string[] = [];
    if (!hasTeamFolder) missing.push("参照フォルダ");
    if (!hasOutputFolder) missing.push("出力フォルダ");
    return `設定が必要です: ${missing.join("、")}`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    return `${diffDays}日前`;
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${agentInfo.color}`}
          >
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{team.name}</h3>
            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              <p>エージェント: {agentInfo.label}</p>
              <p>
                セッション数: {team.session_count || 0} • 最終更新:{" "}
                {formatTimeAgo(team.updated_at)}
              </p>
              {team.output_directory_name && (
                <p className="flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  出力先: {team.output_directory_name}
                </p>
              )}
              {/* Guide message for missing folder settings */}
              {!canOpenChat && (
                <div className="mt-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    {!hasTeamFolder && !hasOutputFolder
                      ? "参照フォルダと出力フォルダが設定されていません"
                      : !hasTeamFolder
                        ? "参照フォルダが設定されていません"
                        : "出力フォルダが設定されていません"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canOpenChat ? (
            <Button size="sm" asChild>
              <Link href={`/${slug}/programs/${programId}/teams/${team.id}/chat`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                チャットを開く
              </Link>
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" disabled className="cursor-not-allowed">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    チャットを開く
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getMissingFoldersMessage()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/${slug}/programs/${programId}/teams/${team.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  設定
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
