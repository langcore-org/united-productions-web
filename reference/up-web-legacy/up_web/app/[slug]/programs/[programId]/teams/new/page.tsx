"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Check,
  ChevronRight,
  Clapperboard,
  Cog,
  ExternalLink,
  File,
  FileText,
  Folder,
  FolderOpen,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import { createTeam } from "../../../actions";
import { createClient } from "@/lib/supabase/client";
import type { AgentType } from "@/lib/types";

// Agent type options
const agentTypes: {
  id: AgentType;
  name: string;
  description: string;
  icon: typeof Search;
}[] = [
  {
    id: "research",
    name: "リサーチ",
    description: "情報収集・調査資料作成",
    icon: Search,
  },
  {
    id: "idea_finder",
    name: "ネタ探し",
    description: "トレンド・話題発掘",
    icon: Lightbulb,
  },
  {
    id: "planning",
    name: "企画作家",
    description: "企画立案・企画書作成",
    icon: Pencil,
  },
  {
    id: "structure",
    name: "構成作家",
    description: "台本・構成作成",
    icon: Clapperboard,
  },
  {
    id: "custom",
    name: "カスタム",
    description: "自分でプロンプトを設定",
    icon: Cog,
  },
];

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
  include_subfolders: boolean;
}

export default function NewTeamPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const programId = params.programId as string;

  // Program data with workspace info
  const [program, setProgram] = useState<{
    id: string;
    name: string;
    workspace_id: string;
    google_drive_root_id: string | null;
    google_drive_root_name: string | null;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [outputTemplate, setOutputTemplate] = useState("");
  const [fileRefs, setFileRefs] = useState<FileRef[]>([]);
  const [outputFolderId, setOutputFolderId] = useState<string | null>(null);
  const [outputFolderName, setOutputFolderName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);

  // File picker state
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

  // Fetch program on mount
  useEffect(() => {
    async function fetchProgram() {
      try {
        const supabase = createClient();

        // Get program with workspace info
        const { data: programData, error: programError } = await supabase
          .from("programs")
          .select("id, name, workspace_id, google_drive_root_id, google_drive_root_name")
          .eq("id", programId)
          .single();

        if (programError) throw programError;

        setProgram(programData);

        // Check Drive connection
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("google_drive_connected")
          .eq("id", programData.workspace_id)
          .single();

        setDriveConnected(workspace?.google_drive_connected || false);
      } catch (err) {
        console.error("Error fetching program:", err);
        setError("番組が見つかりません");
      }
    }
    fetchProgram();
  }, [programId]);

  const isCustom = selectedAgentType === "custom";

  // File picker functions
  const openFilePicker = async (mode: "file" | "output") => {
    if (!program) return;

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
    if (!program) return;

    // Program root folder must be set
    if (!program.google_drive_root_id) {
      setItemError("プログラムのルートフォルダが設定されていません");
      return;
    }

    setIsLoadingItems(true);
    setItemError(null);
    setBreadcrumb([]);

    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${program.workspace_id}&folderId=${program.google_drive_root_id}`
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
    if (!program) return;

    setIsLoadingItems(true);
    setItemError(null);
    setBreadcrumb((prev) => [
      ...prev,
      { id: folder.id, name: folder.name, type: "folder" },
    ]);

    try {
      const response = await fetch(
        `/api/workspace/drive/folders?workspaceId=${program.workspace_id}&folderId=${folder.id}`
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
    if (!program) return;

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
        `/api/workspace/drive/folders?workspaceId=${program.workspace_id}&folderId=${item.id}`
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

  const confirmSelection = () => {
    if (selectedItems.length === 0) return;

    setShowFilePicker(false);

    if (pickerMode === "output") {
      // 出力フォルダを設定
      const selected = selectedItems[0];
      setOutputFolderId(selected.id);
      setOutputFolderName(selected.name);
    } else {
      // 参照ファイル/フォルダを追加
      const newRefs = selectedItems
        .filter((item) => !fileRefs.find((r) => r.drive_id === item.id))
        .map((item) => ({
          id: `temp-${item.id}`,
          ref_type: item.type,
          drive_id: item.id,
          drive_name: item.name,
          include_subfolders: item.type === "folder",
        }));

      if (newRefs.length > 0) {
        setFileRefs([...fileRefs, ...newRefs]);
      }
    }

    setSelectedItems([]);
  };

  const removeFileRef = (refId: string) => {
    setFileRefs(fileRefs.filter((r) => r.id !== refId));
  };

  const toggleSubfolders = (refId: string, value: boolean) => {
    setFileRefs(
      fileRefs.map((r) =>
        r.id === refId ? { ...r, include_subfolders: value } : r
      )
    );
  };

  const clearOutputFolder = () => {
    setOutputFolderId(null);
    setOutputFolderName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentType) {
      setError("エージェントタイプを選択してください");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createTeam(programId, {
        name,
        description: description || undefined,
        agent_type: selectedAgentType,
        system_prompt: isCustom ? systemPrompt : undefined,
        output_format_template: isCustom ? outputTemplate : undefined,
        output_directory_id: outputFolderId || undefined,
        output_directory_name: outputFolderName || undefined,
        file_refs: fileRefs.map((ref) => ({
          ref_type: ref.ref_type,
          drive_id: ref.drive_id,
          drive_name: ref.drive_name,
          include_subfolders: ref.include_subfolders,
        })),
      });

      if (result.success && result.team) {
        router.push(`/${slug}/programs/${programId}`);
      } else {
        setError(result.error || "チームの作成に失敗しました");
      }
    } catch (err) {
      console.error("Error creating team:", err);
      setError("チームの作成中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${slug}/programs/${programId}`}
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る{program ? `（${program.name}）` : ""}
      </Link>

      <PageHeader
        title="新しいチームを作成"
        description="チームの設定とエージェントタイプを選択します"
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">STEP 1: 基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">チーム名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="リサーチチーム"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="番組で取り上げるネタのリサーチを行う"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Agent Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">STEP 2: エージェントタイプ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              エージェントの役割を選択してください
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {agentTypes.map((type) => {
                const IconComponent = type.icon;
                const isSelected = selectedAgentType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedAgentType(type.id)}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isSelected ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <IconComponent
                        className={`h-5 w-5 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{type.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: System Prompt (Custom only) */}
        {isCustom && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">STEP 3: システムプロンプト</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">システムプロンプト *</Label>
                <Textarea
                  id="systemPrompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="あなたは番組制作の専門アシスタントです。与えられた資料を分析し、視聴者に響くコンテンツ企画を提案してください。"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputTemplate">出力フォーマットテンプレート</Label>
                <Textarea
                  id="outputTemplate"
                  value={outputTemplate}
                  onChange={(e) => setOutputTemplate(e.target.value)}
                  placeholder="## タイトル\n## 概要\n## 詳細"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Reference Files */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              STEP {isCustom ? "4" : "3"}: 参照ファイル設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              チームがアクセスできるファイル/フォルダを追加
            </p>

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
                {fileRefs.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    参照ファイルがありません
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openFilePicker("file")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  ファイル/フォルダを追加
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Output Folder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              STEP {isCustom ? "5" : "4"}: 出力先設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              成果物の出力先フォルダを選択
            </p>

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

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !name || !selectedAgentType}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          チームを作成
        </Button>
      </form>

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
              {program?.google_drive_root_name || "ルート"}
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
                {!program?.google_drive_root_id && (
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
