"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  FileText,
  History,
  Loader2,
  Save,
  Tag,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
}

interface PromptDetail {
  id: string;
  key: string;
  name: string;
  description: string | null;
  content: string;
  category: string;
  isActive: boolean;
  currentVersion: number;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
  updatedAt: string;
  versions: PromptVersion[];
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "一般",
  minutes: "議事録",
  transcript: "起こし・NA",
  research: "リサーチ",
  document: "ドキュメント",
};

export default function AdminPromptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const key = decodeURIComponent(params.key as string);

  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [content, setContent] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  const loadPrompt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/prompts/${encodeURIComponent(key)}`);
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.data);
        setContent(data.data.content);
        setChangeNote("");
        setHasChanges(false);
      } else {
        setError("プロンプトの読み込みに失敗しました");
      }
    } catch (err) {
      setError("プロンプトの読み込みに失敗しました");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== prompt?.content);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const response = await fetch(`/api/admin/prompts/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          changeNote: changeNote || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveSuccess(true);
        setHasChanges(false);
        setChangeNote("");
        await loadPrompt();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || "保存に失敗しました");
      }
    } catch (err) {
      setError("保存に失敗しました");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!prompt) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-gray-600">プロンプトが見つかりません</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/admin/prompts")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              一覧に戻る
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => router.push("/admin/prompts")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            一覧に戻る
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{prompt.name}</h1>
                <Badge variant="secondary">v{prompt.currentVersion}</Badge>
              </div>
              <p className="text-gray-600">{prompt.description || "説明なし"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/prompts/${encodeURIComponent(key)}/history`)}
              >
                <History className="w-4 h-4 mr-2" />
                履歴を見る
              </Button>
              {hasChanges && (
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      保存完了
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      保存
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* メインエディタ */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  プロンプト内容
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className={cn(
                    "min-h-[500px] font-mono text-sm resize-none",
                    hasChanges && "border-blue-500",
                  )}
                  placeholder="プロンプト内容を入力..."
                />
              </CardContent>
            </Card>

            {/* 変更理由 */}
            {hasChanges && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">変更理由（任意）</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="この変更の理由やメモを入力..."
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* サイドバー情報 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">プロンプト情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">キー</Label>
                  <p className="text-sm font-mono">{prompt.key}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-gray-500">カテゴリ</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[prompt.category] || prompt.category}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-gray-500">現在のバージョン</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <History className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">v{prompt.currentVersion}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-gray-500">最終更新</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{formatDate(prompt.updatedAt)}</span>
                  </div>
                </div>
                {prompt.changedBy && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-gray-500">最終更新者</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{prompt.changedBy}</span>
                      </div>
                    </div>
                  </>
                )}
                {prompt.changeNote && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-gray-500">前回の変更メモ</Label>
                      <p className="text-sm mt-1 text-gray-600">{prompt.changeNote}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 最近のバージョン */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">最近のバージョン</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/prompts/${encodeURIComponent(key)}/history`)}
                >
                  すべて見る
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(prompt.versions || []).slice(0, 5).map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/admin/prompts/${encodeURIComponent(key)}/history/${version.version}`,
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">v{version.version}</span>
                        {version.changeNote && (
                          <span className="text-xs text-gray-500 truncate max-w-[150px]">
                            {version.changeNote}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(version.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
