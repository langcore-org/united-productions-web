"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/layout";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
  Tv,
  Upload,
  AlertCircle,
} from "lucide-react";
import { createProgram, getWorkspaceBySlug } from "../actions";
import type { ProgramStatus } from "@/lib/types";

// Mock folder structure - will be replaced with actual Google Drive integration
const mockFolders = [
  {
    id: "1",
    name: "ABC制作会社 共有ドライブ",
    children: [
      {
        id: "2",
        name: "番組制作",
        children: [
          { id: "3", name: "朝の情報番組", children: [] },
          { id: "4", name: "夜のバラエティ", children: [] },
          { id: "5", name: "特別企画", children: [] },
        ],
      },
    ],
  },
];

type FolderNode = {
  id: string;
  name: string;
  children: FolderNode[];
};

export default function NewProgramPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProgramStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["1", "2"])
  );

  // Fetch workspace ID on mount
  useEffect(() => {
    async function fetchWorkspace() {
      const workspace = await getWorkspaceBySlug(slug);
      if (workspace) {
        setWorkspaceId(workspace.id);
      } else {
        setError("ワークスペースが見つかりません");
      }
    }
    fetchWorkspace();
  }, [slug]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const selectFolder = (folderId: string, path: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderPath(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError("ワークスペースが見つかりません");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createProgram(workspaceId, {
        name,
        description: description || undefined,
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        google_drive_root_id: selectedFolderId || undefined,
        google_drive_root_name: selectedFolderPath || undefined,
      });

      if (result.success && result.program) {
        router.push(`/${slug}/programs/${result.program.id}`);
      } else {
        setError(result.error || "番組の作成に失敗しました");
      }
    } catch (err) {
      console.error("Error creating program:", err);
      setError("番組の作成中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFolder = (
    folder: FolderNode,
    path: string = "",
    level: number = 0
  ): React.ReactNode => {
    const currentPath = path ? `${path}/${folder.name}` : folder.name;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted ${
            isSelected ? "bg-primary/10 text-primary" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleFolder(folder.id);
            }
            selectFolder(folder.id, currentPath);
          }}
        >
          {hasChildren ? (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          ) : (
            <span className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )}
          <span>{folder.name}</span>
          {isSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
        </div>
        {isExpanded &&
          hasChildren &&
          folder.children.map((child) =>
            renderFolder(child, currentPath, level + 1)
          )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${slug}/programs`}
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Link>

      <PageHeader
        title="新しい番組を作成"
        description="番組の基本情報とGoogle Drive連携を設定します"
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
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-24 w-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                <Tv className="h-8 w-8 text-muted-foreground" />
              </div>
              <Button type="button" variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                カバー画像をアップロード
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">番組名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="朝の情報番組"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="毎週月〜金曜日、朝8時から放送の情報番組"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>ステータス</Label>
              <RadioGroup
                value={status}
                onValueChange={(v) => setStatus(v as ProgramStatus)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="font-normal">
                    進行中
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="archived" id="archived" />
                  <Label htmlFor="archived" className="font-normal">
                    アーカイブ
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="completed" />
                  <Label htmlFor="completed" className="font-normal">
                    完了
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
          </CardContent>
        </Card>

        {/* Step 2: Google Drive */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">STEP 2: Google Drive連携</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              この番組で使用するGoogle
              Driveのルートフォルダを選択してください。チームは、このフォルダ内のファイルを参照できます。
            </p>

            <div className="rounded-lg border p-4">
              {mockFolders.map((folder) => renderFolder(folder))}
            </div>

            {selectedFolderPath && (
              <div className="space-y-2">
                <p className="text-sm">
                  選択中: <span className="font-medium">{selectedFolderPath}</span>
                </p>
                <Input
                  readOnly
                  value="https://drive.google.com/drive/folders/..."
                  className="bg-muted text-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isLoading || !name || !workspaceId}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          番組を作成
        </Button>
      </form>
    </div>
  );
}
