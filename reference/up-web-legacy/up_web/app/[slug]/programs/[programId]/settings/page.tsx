"use client";

import { useState, useCallback, useEffect, use } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout";
import { ImageUpload } from "@/components/uploads/ImageUpload";
import {
  ArrowLeft,
  Loader2,
  Tv,
  Folder,
  FolderOpen,
  HardDrive,
  ChevronRight,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SharedDrive {
  id: string;
  name: string;
}

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  type: "root" | "drive" | "folder";
  driveId?: string;
}

export default function ProgramSettingsPage({
  params,
}: {
  params: Promise<{ slug: string; programId: string }>;
}) {
  const { slug, programId } = use(params);

  // Program data
  const [program, setProgram] = useState<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    google_drive_root_id: string | null;
    google_drive_root_name: string | null;
    cover_image_url: string | null;
    workspace_id: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [driveFolderName, setDriveFolderName] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // Folder picker state
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([]);
  const [sharedFolders, setSharedFolders] = useState<DriveFolder[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"drives" | "folders">("folders");

  // Fetch program data
  useEffect(() => {
    async function fetchProgram() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("programs")
          .select(
            `
            id, name, description, status, start_date, end_date,
            google_drive_root_id, google_drive_root_name, cover_image_url,
            workspace_id
          `
          )
          .eq("id", programId)
          .single();

        if (error) throw error;

        setProgram(data);
        setName(data.name);
        setDescription(data.description || "");
        setStatus(data.status || "active");
        setStartDate(data.start_date || "");
        setEndDate(data.end_date || "");
        setDriveFolderId(data.google_drive_root_id);
        setDriveFolderName(data.google_drive_root_name);
        setCoverUrl(data.cover_image_url);

        // Check if Drive is connected
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("google_drive_connected")
          .eq("id", data.workspace_id)
          .single();

        setDriveConnected(workspace?.google_drive_connected || false);
      } catch (error) {
        console.error("Failed to fetch program:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgram();
  }, [programId]);

  const handleCoverUpload = useCallback(
    async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/programs/${programId}/cover`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload cover");
      }

      const data = await response.json();
      setCoverUrl(data.cover_image_url);
      return data.cover_image_url;
    },
    [programId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;

    setIsSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("programs")
        .update({
          name,
          description: description || null,
          status,
          start_date: startDate || null,
          end_date: endDate || null,
          google_drive_root_id: driveFolderId,
          google_drive_root_name: driveFolderName,
        })
        .eq("id", programId);

      if (error) throw error;

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Folder picker functions
  const openFolderPicker = async () => {
    if (!program) return;

    setShowFolderPicker(true);
    setFolderError(null);
    setBreadcrumb([]);
    setSelectedFolder(null);
    setFolders([]);

    await loadRootItems();
  };

  const loadRootItems = async () => {
    if (!program) return;

    setIsLoadingFolders(true);
    setFolderError(null);

    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${program.workspace_id}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load drives");
      }

      const data = await response.json();
      setSharedDrives(data.sharedDrives || []);
      setSharedFolders(data.folders || []);
      setFolders([]);
      setBreadcrumb([]);

      // 共有フォルダがあれば共有フォルダタブを、なければ共有ドライブタブをデフォルトに
      if ((data.folders || []).length > 0) {
        setActiveTab("folders");
      } else if ((data.sharedDrives || []).length > 0) {
        setActiveTab("drives");
      }
    } catch (error) {
      const err = error as Error;
      setFolderError(err.message);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // ダブルクリックでフォルダに入る
  const navigateToFolder = async (folder: DriveFolder, rootName?: string) => {
    if (!program) return;

    setIsLoadingFolders(true);
    setFolderError(null);
    setSelectedFolder(null);

    // パンくずリストを更新
    if (breadcrumb.length === 0 && rootName) {
      // ルートフォルダからの最初のナビゲーション
      setBreadcrumb([
        { id: folder.id, name: rootName, type: "folder" },
      ]);
    } else {
      setBreadcrumb((prev) => [
        ...prev,
        { id: folder.id, name: folder.name, type: "folder" },
      ]);
    }

    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${program.workspace_id}&folderId=${folder.id}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load folders");
      }

      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      const err = error as Error;
      setFolderError(err.message);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // ダブルクリックで共有ドライブに入る
  const navigateToDrive = async (drive: SharedDrive) => {
    if (!program) return;

    setIsLoadingFolders(true);
    setFolderError(null);
    setBreadcrumb([
      { id: drive.id, name: drive.name, type: "drive", driveId: drive.id },
    ]);
    setSelectedFolder(null);

    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${program.workspace_id}&driveId=${drive.id}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load folders");
      }

      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      const err = error as Error;
      setFolderError(err.message);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // パンくずナビゲーション
  const navigateToBreadcrumb = async (index: number) => {
    if (!program) return;

    // -1 はルートに戻る
    if (index < 0) {
      await loadRootItems();
      return;
    }

    const item = breadcrumb[index];
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    setSelectedFolder(null);

    setIsLoadingFolders(true);
    try {
      if (item.type === "drive") {
        const response = await fetch(
          `/api/workspace/drive/folders?workspaceId=${program.workspace_id}&driveId=${item.driveId}`
        );
        const data = await response.json();
        setFolders(data.folders || []);
      } else {
        const response = await fetch(
          `/api/workspace/drive/folders?workspaceId=${program.workspace_id}&folderId=${item.id}`
        );
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch {
      setFolderError("Failed to load folders");
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // シングルクリックで選択
  const selectFolder = (folder: DriveFolder) => {
    setSelectedFolder({ id: folder.id, name: folder.name });
  };

  // 共有ドライブをルートとして選択
  const selectDrive = (drive: SharedDrive) => {
    setSelectedFolder({ id: drive.id, name: drive.name });
  };

  const confirmFolderSelection = async () => {
    if (!selectedFolder || !program) return;

    setShowFolderPicker(false);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("programs")
        .update({
          google_drive_root_id: selectedFolder.id,
          google_drive_root_name: selectedFolder.name,
        })
        .eq("id", programId);

      if (error) throw error;

      setDriveFolderId(selectedFolder.id);
      setDriveFolderName(selectedFolder.name);
    } catch (error) {
      console.error("Failed to save folder:", error);
    }
  };

  const clearFolder = async () => {
    if (!program) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("programs")
        .update({
          google_drive_root_id: null,
          google_drive_root_name: null,
        })
        .eq("id", programId);

      if (error) throw error;

      setDriveFolderId(null);
      setDriveFolderName(null);
    } catch (error) {
      console.error("Failed to clear folder:", error);
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

  if (!program) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">番組が見つかりません</p>
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

      <PageHeader title="番組設定" description="番組の基本情報を編集します" />

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImageUpload
              currentImageUrl={coverUrl}
              onUpload={handleCoverUpload}
              aspectRatio={16 / 9}
              cropShape="rect"
              placeholder={<Tv className="h-8 w-8 text-muted-foreground" />}
              buttonLabel="カバー画像を変更"
              imageClassName="h-24 w-40"
            />

            <div className="space-y-2">
              <Label htmlFor="name">番組名 *</Label>
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
              <Label>ステータス</Label>
              <RadioGroup
                value={status}
                onValueChange={setStatus}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="font-normal">
                    アクティブ
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="completed" />
                  <Label htmlFor="completed" className="font-normal">
                    完了
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="archived" id="archived" />
                  <Label htmlFor="archived" className="font-normal">
                    アーカイブ
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>期間</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-muted-foreground">〜</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaved ? "保存しました" : "変更を保存"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Google Drive設定 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Google Drive連携</CardTitle>
          <CardDescription>
            この番組で参照するGoogle Driveフォルダを設定します
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
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-500">
                    ワークスペース設定でGoogle
                    Drive連携を設定してください。
                  </p>
                  <Link
                    href={`/${slug}/settings/drive`}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-yellow-700 hover:underline dark:text-yellow-400"
                  >
                    ワークスペース設定へ
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">参照フォルダ</h3>
                  <p className="text-sm text-muted-foreground">
                    {driveFolderName || "未設定"}
                  </p>
                  {driveFolderId && (
                    <p className="text-xs text-muted-foreground/70">
                      ID: {driveFolderId}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={openFolderPicker}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  {driveFolderId ? "フォルダを変更" : "フォルダを選択"}
                </Button>
                {driveFolderId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearFolder}
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

      {/* 危険な操作 */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">危険な操作</CardTitle>
          <CardDescription>
            番組を削除すると、すべてのチーム、セッション、成果物が削除されます。この操作は取り消せません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">番組を削除</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>番組を削除しますか？</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      「{name}
                      」を削除すると、以下のすべてが完全に削除されます：
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      <li>すべてのチーム</li>
                      <li>すべてのチャットセッション</li>
                      <li>すべての成果物</li>
                    </ul>
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="confirmName">
                        確認のため、番組名を入力してください：
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

      {/* フォルダ選択ダイアログ */}
      <Dialog open={showFolderPicker} onOpenChange={setShowFolderPicker}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>参照フォルダを選択</DialogTitle>
            <DialogDescription>
              この番組のルートディレクトリを選択してください。シングルクリックで選択、ダブルクリックでフォルダ内に移動します。
            </DialogDescription>
          </DialogHeader>

          {/* Breadcrumb - サブフォルダ閲覧中のみ表示 */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 text-sm overflow-x-auto py-2 border-b">
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className="text-muted-foreground hover:text-foreground"
              >
                ルート
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
          )}

          {/* ルートレベル: タブ表示 */}
          {breadcrumb.length === 0 ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "drives" | "folders")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="folders" disabled={sharedFolders.length === 0}>
                  共有フォルダ ({sharedFolders.length})
                </TabsTrigger>
                <TabsTrigger value="drives" disabled={sharedDrives.length === 0}>
                  共有ドライブ ({sharedDrives.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="folders" className="mt-2">
                <ScrollArea className="h-[280px] rounded-lg border">
                  {isLoadingFolders ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : folderError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                      <p className="text-sm text-destructive">{folderError}</p>
                    </div>
                  ) : sharedFolders.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Folder className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">共有フォルダがありません</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {sharedFolders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => selectFolder(folder)}
                          onDoubleClick={() => navigateToFolder(folder, folder.name)}
                          className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                            selectedFolder?.id === folder.id
                              ? "bg-blue-100 dark:bg-blue-950/50"
                              : "hover:bg-muted"
                          }`}
                        >
                          <Folder
                            className={`h-5 w-5 flex-shrink-0 ${
                              selectedFolder?.id === folder.id
                                ? "text-blue-600"
                                : "text-yellow-500"
                            }`}
                          />
                          <span className="flex-1 truncate">{folder.name}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="drives" className="mt-2">
                <ScrollArea className="h-[280px] rounded-lg border">
                  {isLoadingFolders ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : folderError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                      <p className="text-sm text-destructive">{folderError}</p>
                    </div>
                  ) : sharedDrives.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <HardDrive className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">共有ドライブがありません</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {sharedDrives.map((drive) => (
                        <button
                          key={drive.id}
                          onClick={() => selectDrive(drive)}
                          onDoubleClick={() => navigateToDrive(drive)}
                          className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                            selectedFolder?.id === drive.id
                              ? "bg-blue-100 dark:bg-blue-950/50"
                              : "hover:bg-muted"
                          }`}
                        >
                          <HardDrive
                            className={`h-5 w-5 flex-shrink-0 ${
                              selectedFolder?.id === drive.id
                                ? "text-blue-600"
                                : "text-blue-500"
                            }`}
                          />
                          <span className="flex-1 truncate">{drive.name}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            /* サブフォルダ閲覧中 */
            <ScrollArea className="h-[300px] rounded-lg border">
              {isLoadingFolders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : folderError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-destructive">{folderError}</p>
                </div>
              ) : folders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Folder className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">サブフォルダがありません</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => selectFolder(folder)}
                      onDoubleClick={() => navigateToFolder(folder)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        selectedFolder?.id === folder.id
                          ? "bg-blue-100 dark:bg-blue-950/50"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Folder
                        className={`h-5 w-5 flex-shrink-0 ${
                          selectedFolder?.id === folder.id
                            ? "text-blue-600"
                            : "text-yellow-500"
                        }`}
                      />
                      <span className="flex-1 truncate">{folder.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {/* Selected folder display */}
          {selectedFolder && (
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
              <p className="text-sm text-muted-foreground">ルートディレクトリとして選択中:</p>
              <p className="font-medium text-blue-700 dark:text-blue-400">
                {selectedFolder.name}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFolderPicker(false)}
            >
              キャンセル
            </Button>
            <Button onClick={confirmFolderSelection} disabled={!selectedFolder}>
              このフォルダをルートに設定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
