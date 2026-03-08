"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout";
import {
  ArrowLeft,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SelectableFolderTree, type SelectedItem } from "@/components/sidebar/SelectableFolderTree";

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  type: "folder";
}

interface FileRef {
  id: string;
  ref_type: "file" | "folder";
  drive_id: string;
  drive_name: string;
  drive_path: string | null;
  drive_url: string | null;
  mime_type: string | null;
  include_subfolders: boolean;
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  research: "リサーチ",
  idea_finder: "アイデア発見",
  planning: "企画",
  structure: "構成",
  custom: "カスタム",
};

export default function TeamSettingsPage({
  params,
}: {
  params: Promise<{ slug: string; programId: string; teamId: string }>;
}) {
  const { slug, programId, teamId } = use(params);

  // Team data
  const [team, setTeam] = useState<{
    id: string;
    name: string;
    description: string | null;
    agent_type: string;
    output_directory_id: string | null;
    output_directory_name: string | null;
    output_directory_url: string | null;
    program: {
      workspace_id: string;
      google_drive_root_id: string | null;
      google_drive_root_name: string | null;
    };
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileRefs, setFileRefs] = useState<FileRef[]>([]);
  const [outputFolderId, setOutputFolderId] = useState<string | null>(null);
  const [outputFolderName, setOutputFolderName] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [driveConnected, setDriveConnected] = useState(false);

  // File picker state (for output folder modal)
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"file" | "output">("file");
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [currentItems, setCurrentItems] = useState<DriveItem[]>([]);
  const [currentFiles, setCurrentFiles] = useState<DriveItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    { id: string; name: string; type: "file" | "folder"; mimeType: string }[]
  >([]);

  // Inline tree selection state (for reference files)
  const [treeSelectedItems, setTreeSelectedItems] = useState<SelectedItem[]>([]);
  const [isAddingRefs, setIsAddingRefs] = useState(false);

  // Fetch team data
  useEffect(() => {
    async function fetchTeam() {
      try {
        const supabase = createClient();

        // Get team with program info
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select(
            `
            id, name, description, agent_type,
            output_directory_id, output_directory_name, output_directory_url,
            program:programs!inner(workspace_id, google_drive_root_id, google_drive_root_name)
          `
          )
          .eq("id", teamId)
          .single();

        if (teamError) throw teamError;

        // Get file refs
        const { data: refsData, error: refsError } = await supabase
          .from("team_file_refs")
          .select("*")
          .eq("team_id", teamId)
          .order("display_order");

        if (refsError) throw refsError;

        setTeam(teamData);
        setName(teamData.name);
        setDescription(teamData.description || "");
        setOutputFolderId(teamData.output_directory_id);
        setOutputFolderName(teamData.output_directory_name);
        setFileRefs(refsData || []);

        // Check Drive connection
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("google_drive_connected")
          .eq("id", teamData.program.workspace_id)
          .single();

        setDriveConnected(workspace?.google_drive_connected || false);
      } catch (error) {
        console.error("Failed to fetch team:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeam();
  }, [teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setIsSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("teams")
        .update({
          name,
          description: description || null,
        })
        .eq("id", teamId);

      if (error) throw error;

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // File picker functions
  const openFilePicker = async (mode: "file" | "output") => {
    if (!team) return;

    setPickerMode(mode);
    setShowFilePicker(true);
    setItemError(null);
    setBreadcrumb([]);
    setSelectedItems([]);
    setCurrentItems([]);
    setCurrentFiles([]);

    await loadRootItems();
  };

  const loadRootItems = async () => {
    if (!team) return;

    // Program root folder must be set
    if (!team.program.google_drive_root_id) {
      setItemError("プログラムのルートフォルダが設定されていません");
      return;
    }

    setIsLoadingItems(true);
    setItemError(null);
    setBreadcrumb([]);

    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${team.program.workspace_id}&folderId=${team.program.google_drive_root_id}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load");
      }

      const data = await response.json();
      setCurrentItems(data.folders || []);
      setCurrentFiles(data.files || []);
    } catch (error) {
      const err = error as Error;
      setItemError(err.message);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const navigateToFolder = async (folder: DriveItem) => {
    if (!team) return;

    setIsLoadingItems(true);
    setItemError(null);
    setBreadcrumb((prev) => [
      ...prev,
      { id: folder.id, name: folder.name, type: "folder" },
    ]);

    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${team.program.workspace_id}&folderId=${folder.id}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load");
      }

      const data = await response.json();
      setCurrentItems(data.folders || []);
      setCurrentFiles(data.files || []);
    } catch (error) {
      const err = error as Error;
      setItemError(err.message);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const navigateToBreadcrumb = async (index: number) => {
    if (!team) return;

    // Navigate to program root folder
    if (index < 0) {
      await loadRootItems();
      return;
    }

    const item = breadcrumb[index];
    setBreadcrumb(breadcrumb.slice(0, index + 1));

    setIsLoadingItems(true);
    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${team.program.workspace_id}&folderId=${item.id}`
      );
      const data = await response.json();
      setCurrentItems(data.folders || []);
      setCurrentFiles(data.files || []);
    } catch {
      setItemError("Failed to load");
    } finally {
      setIsLoadingItems(false);
    }
  };

  const toggleSelectItem = (
    item: DriveItem,
    type: "file" | "folder"
  ) => {
    if (pickerMode === "output") {
      // 出力フォルダは1つのみ
      setSelectedItems([{ id: item.id, name: item.name, type: "folder", mimeType: item.mimeType }]);
    } else {
      // ファイル/フォルダは複数選択可能
      const exists = selectedItems.find((s) => s.id === item.id);
      if (exists) {
        setSelectedItems(selectedItems.filter((s) => s.id !== item.id));
      } else {
        setSelectedItems([
          ...selectedItems,
          { id: item.id, name: item.name, type, mimeType: item.mimeType },
        ]);
      }
    }
  };

  const confirmSelection = async () => {
    if (!team || selectedItems.length === 0) return;

    setShowFilePicker(false);

    const supabase = createClient();

    if (pickerMode === "output") {
      // 出力フォルダを保存
      const selected = selectedItems[0];
      const { error } = await supabase
        .from("teams")
        .update({
          output_directory_id: selected.id,
          output_directory_name: selected.name,
        })
        .eq("id", teamId);

      if (!error) {
        setOutputFolderId(selected.id);
        setOutputFolderName(selected.name);
      }
    } else {
      // 参照ファイル/フォルダを追加
      const newRefs = selectedItems
        .filter((item) => !fileRefs.find((r) => r.drive_id === item.id))
        .map((item, index) => ({
          team_id: teamId,
          ref_type: item.type,
          drive_id: item.id,
          drive_name: item.name,
          mime_type: item.mimeType,
          include_subfolders: item.type === "folder",
          display_order: fileRefs.length + index,
        }));

      if (newRefs.length > 0) {
        const { data, error } = await supabase
          .from("team_file_refs")
          .insert(newRefs)
          .select();

        if (!error && data) {
          setFileRefs([...fileRefs, ...data]);
        }
      }
    }

    setSelectedItems([]);
  };

  const removeFileRef = async (refId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("team_file_refs")
      .delete()
      .eq("id", refId);

    if (!error) {
      setFileRefs(fileRefs.filter((r) => r.id !== refId));
    }
  };

  const toggleSubfolders = async (refId: string, value: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("team_file_refs")
      .update({ include_subfolders: value })
      .eq("id", refId);

    if (!error) {
      setFileRefs(
        fileRefs.map((r) =>
          r.id === refId ? { ...r, include_subfolders: value } : r
        )
      );
    }
  };

  const clearOutputFolder = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("teams")
      .update({
        output_directory_id: null,
        output_directory_name: null,
        output_directory_url: null,
      })
      .eq("id", teamId);

    if (!error) {
      setOutputFolderId(null);
      setOutputFolderName(null);
    }
  };

  // Add items from inline tree to file refs
  const addTreeSelectedItems = async () => {
    if (treeSelectedItems.length === 0) return;

    setIsAddingRefs(true);

    try {
      const supabase = createClient();

      const newRefs = treeSelectedItems
        .filter((item) => !fileRefs.find((r) => r.drive_id === item.id))
        .map((item, index) => ({
          team_id: teamId,
          ref_type: item.type,
          drive_id: item.id,
          drive_name: item.name,
          mime_type: item.mimeType,
          include_subfolders: item.type === "folder",
          display_order: fileRefs.length + index,
        }));

      if (newRefs.length > 0) {
        const { data, error } = await supabase
          .from("team_file_refs")
          .insert(newRefs)
          .select();

        if (!error && data) {
          setFileRefs([...fileRefs, ...data]);
        }
      }

      setTreeSelectedItems([]);
    } finally {
      setIsAddingRefs(false);
    }
  };

  const canDelete = deleteConfirmName === name;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">チームが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${slug}/programs/${programId}`}
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る（{name}）
      </Link>

      <PageHeader title="チーム設定" description="チームの設定を編集します" />

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">チーム名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>エージェントタイプ</Label>
              <p className="text-sm text-muted-foreground">
                {AGENT_TYPE_LABELS[team.agent_type] || team.agent_type}
              </p>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaved ? "保存しました" : "変更を保存"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Reference Files */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">参照ファイル/フォルダ</CardTitle>
          <CardDescription>
            このチームが@メンションで参照できるファイルとフォルダ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!driveConnected ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-400">
                    Google Driveが未接続です
                  </p>
                  <Link
                    href={`/${slug}/settings/drive`}
                    className="mt-1 inline-flex items-center gap-1 text-sm text-yellow-700 hover:underline dark:text-yellow-400"
                  >
                    ワークスペース設定へ
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Current file refs list */}
              {fileRefs.length > 0 && (
                <div className="rounded-lg border divide-y">
                  {fileRefs.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {ref.ref_type === "folder" ? (
                          <FolderOpen className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                        ) : (
                          <FileText className="h-5 w-5 flex-shrink-0 text-gray-500" />
                        )}
                        <span className="truncate text-sm">{ref.drive_name}</span>
                        {ref.ref_type === "folder" && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Checkbox
                              id={`subfolder-${ref.id}`}
                              checked={ref.include_subfolders}
                              onCheckedChange={(checked) =>
                                toggleSubfolders(ref.id, !!checked)
                              }
                            />
                            <Label
                              htmlFor={`subfolder-${ref.id}`}
                              className="text-xs font-normal text-muted-foreground whitespace-nowrap"
                            >
                              サブフォルダ含む
                            </Label>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFileRef(ref.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline folder tree for selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">フォルダを選択して追加</Label>
                <SelectableFolderTree
                  workspaceId={team.program.workspace_id}
                  rootFolderId={team.program.google_drive_root_id}
                  rootFolderName={team.program.google_drive_root_name || undefined}
                  selectedItems={treeSelectedItems}
                  onSelectionChange={setTreeSelectedItems}
                  mode="file"
                  multiSelect={true}
                  maxHeight="300px"
                />
                {treeSelectedItems.length > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                    <span className="text-sm text-muted-foreground">
                      {treeSelectedItems.length}件選択中
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addTreeSelectedItems}
                      disabled={isAddingRefs}
                    >
                      {isAddingRefs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Plus className="mr-2 h-4 w-4" />
                      追加
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Output Folder */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">出力先フォルダ</CardTitle>
          <CardDescription>
            成果物をエクスポートする先のフォルダ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!driveConnected ? (
            <p className="text-sm text-muted-foreground">
              Google Driveが未接続です
            </p>
          ) : (
            <>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <FolderOpen className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">出力フォルダ</h3>
                  <p className="text-sm text-muted-foreground">
                    {outputFolderName || "未設定"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openFilePicker("output")}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  {outputFolderId ? "出力先を変更" : "出力先を設定"}
                </Button>
                {outputFolderId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearOutputFolder}
                    className="text-muted-foreground"
                  >
                    クリア
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">危険な操作</CardTitle>
          <CardDescription>
            チームを削除すると、すべてのセッションと成果物が削除されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">チームを削除</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>チームを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p>「{name}」を削除すると、以下が完全に削除されます：</p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      <li>すべてのチャットセッション</li>
                      <li>すべての成果物</li>
                    </ul>
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="confirmName">
                        確認のため、チーム名を入力してください：
                      </Label>
                      <Input
                        id="confirmName"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={name}
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={!canDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  永久に削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* File/Folder Picker Dialog */}
      <Dialog open={showFilePicker} onOpenChange={setShowFilePicker}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {pickerMode === "output"
                ? "出力先フォルダを選択"
                : "ファイル/フォルダを追加"}
            </DialogTitle>
            <DialogDescription>
              {pickerMode === "output"
                ? "成果物をエクスポートするフォルダを選択してください"
                : "シングルクリックで選択、ダブルクリックでフォルダ内に移動"}
            </DialogDescription>
          </DialogHeader>

          {/* Breadcrumb - shows program root folder name */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto py-2 border-b">
            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className={`hover:text-foreground flex items-center gap-1 ${
                breadcrumb.length === 0
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <Folder className="h-4 w-4 text-yellow-500" />
              {team?.program.google_drive_root_name || "ルート"}
            </button>
            {breadcrumb.map((item, index) => (
              <div key={item.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`hover:text-foreground ${
                    index === breadcrumb.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>

          {/* File browser */}
          <ScrollArea className="h-[300px] rounded-lg border">
            {isLoadingItems ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : itemError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive">{itemError}</p>
                {!team?.program.google_drive_root_id && (
                  <Link
                    href={`/${slug}/programs/${programId}/settings`}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    プログラム設定でルートフォルダを設定
                  </Link>
                )}
              </div>
            ) : currentItems.length === 0 && currentFiles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Folder className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {pickerMode === "output"
                    ? "サブフォルダがありません"
                    : "ファイル/フォルダがありません"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {currentItems.map((folder) => {
                  const isSelected = selectedItems.some(
                    (s) => s.id === folder.id
                  );
                  return (
                    <button
                      key={folder.id}
                      onClick={() => toggleSelectItem(folder, "folder")}
                      onDoubleClick={() => navigateToFolder(folder)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        isSelected
                          ? "bg-blue-100 dark:bg-blue-950/50"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Folder
                        className={`h-5 w-5 flex-shrink-0 ${
                          isSelected ? "text-blue-600" : "text-yellow-500"
                        }`}
                      />
                      <span className="flex-1 truncate">{folder.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
                {/* Show files only in file picker mode */}
                {pickerMode === "file" &&
                  currentFiles.map((file) => {
                    const isSelected = selectedItems.some(
                      (s) => s.id === file.id
                    );
                    return (
                      <button
                        key={file.id}
                        onClick={() => toggleSelectItem(file, "file")}
                        className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                          isSelected
                            ? "bg-blue-100 dark:bg-blue-950/50"
                            : "hover:bg-muted"
                        }`}
                      >
                        <File
                          className={`h-5 w-5 flex-shrink-0 ${
                            isSelected ? "text-blue-600" : "text-gray-500"
                          }`}
                        />
                        <span className="flex-1 truncate">{file.name}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </ScrollArea>

          {/* Selected items */}
          {selectedItems.length > 0 && (
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
              <p className="text-sm text-muted-foreground mb-1">
                {pickerMode === "output" ? "選択中:" : `${selectedItems.length}件選択中:`}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedItems.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-400"
                  >
                    {item.type === "folder" ? (
                      <Folder className="h-3 w-3" />
                    ) : (
                      <File className="h-3 w-3" />
                    )}
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilePicker(false)}>
              キャンセル
            </Button>
            <Button
              onClick={confirmSelection}
              disabled={selectedItems.length === 0}
            >
              {pickerMode === "output" ? "設定" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
