"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  FileText,
  History,
  Loader2,
  RotateCcw,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface VersionDetail {
  version: number;
  content: string;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
}

export default function AdminPromptVersionPage() {
  const router = useRouter();
  const params = useParams();
  const key = decodeURIComponent(params.key as string);
  const versionNum = parseInt(params.version as string, 10);

  const [version, setVersion] = useState<VersionDetail | null>(null);
  const [promptName, setPromptName] = useState("");
  const [currentVersion, setCurrentVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreNote, setRestoreNote] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersion();
  }, [loadVersion]);

  const loadVersion = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const detailResponse = await fetch(`/api/admin/prompts/${encodeURIComponent(key)}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        setPromptName(detailData.data.name);
        setCurrentVersion(detailData.data.currentVersion);
      }

      const response = await fetch(
        `/api/admin/prompts/${encodeURIComponent(key)}/history/${versionNum}`,
      );
      if (response.ok) {
        const data = await response.json();
        setVersion(data.data);
      } else {
        setError("バージョンの読み込みに失敗しました");
      }
    } catch (err) {
      setError("バージョンの読み込みに失敗しました");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/prompts/${encodeURIComponent(key)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: versionNum,
          changeNote: restoreNote || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRestoreSuccess(true);
        setShowRestoreDialog(false);
        setRestoreNote("");
        setCurrentVersion(data.data.version);
        setTimeout(() => setRestoreSuccess(false), 3000);
      } else {
        setError(data.error || "復元に失敗しました");
      }
    } catch (err) {
      setError("復元に失敗しました");
      console.error(err);
    } finally {
      setIsRestoring(false);
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

  if (!version) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-gray-600">バージョンが見つかりません</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push(`/admin/prompts/${encodeURIComponent(key)}/history`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              履歴に戻る
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isCurrentVersion = version.version === currentVersion;

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => router.push(`/admin/prompts/${encodeURIComponent(key)}/history`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            履歴に戻る
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{promptName || key}</h1>
                <Badge variant={isCurrentVersion ? "default" : "secondary"}>
                  v{version.version}
                  {isCurrentVersion && " (現在)"}
                </Badge>
              </div>
              <p className="text-gray-600">
                {isCurrentVersion ? "現在のバージョン" : `バージョン ${version.version} の内容`}
              </p>
            </div>
            {!isCurrentVersion && (
              <Button onClick={() => setShowRestoreDialog(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                このバージョンに復元
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {restoreSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            復元が完了しました
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  プロンプト内容
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg min-h-[400px]">
                  {version.content}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* サイドバー情報 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">バージョン情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs text-gray-500">バージョン</span>
                  <div className="flex items-center gap-2 mt-1">
                    <History className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">v{version.version}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">作成日時</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{formatDate(version.createdAt)}</span>
                  </div>
                </div>
                {version.changedBy && (
                  <div>
                    <span className="text-xs text-gray-500">作成者</span>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{version.changedBy}</span>
                    </div>
                  </div>
                )}
                {version.changeNote && (
                  <div>
                    <span className="text-xs text-gray-500">変更メモ</span>
                    <p className="text-sm mt-1 text-gray-600">{version.changeNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* アクション */}
            {!isCurrentVersion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">アクション</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" onClick={() => setShowRestoreDialog(true)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    このバージョンに復元
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/admin/prompts/${encodeURIComponent(key)}`)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    現在のバージョンを編集
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 復元確認ダイアログ */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>バージョンの復元</DialogTitle>
              <DialogDescription>
                バージョン {version.version} に戻します。 現在の内容はバージョン{" "}
                {currentVersion + 1} として保存されます。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">復元理由（任意）</label>
                <Textarea
                  value={restoreNote}
                  onChange={(e) => setRestoreNote(e.target.value)}
                  placeholder="復元の理由やメモを入力..."
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleRestore} disabled={isRestoring} className="gap-2">
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    復元中...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    復元する
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
