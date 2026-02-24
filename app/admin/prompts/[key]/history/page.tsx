"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Eye,
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
import { cn } from "@/lib/utils";

interface PromptVersion {
  version: number;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
}

export default function AdminPromptHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const key = decodeURIComponent(params.key as string);

  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [promptName, setPromptName] = useState("");
  const [currentVersion, setCurrentVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<PromptVersion | null>(null);
  const [restoreNote, setRestoreNote] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const detailResponse = await fetch(`/api/admin/prompts/${encodeURIComponent(key)}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        setPromptName(detailData.data.name);
        setCurrentVersion(detailData.data.currentVersion);
      }

      const response = await fetch(`/api/admin/prompts/${encodeURIComponent(key)}/history`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.data.versions || []);
      } else {
        setError("履歴の読み込みに失敗しました");
      }
    } catch (err) {
      setError("履歴の読み込みに失敗しました");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    setIsRestoring(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/prompts/${encodeURIComponent(key)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: restoreTarget.version,
          changeNote: restoreNote || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRestoreSuccess(true);
        setRestoreTarget(null);
        setRestoreNote("");
        await loadHistory();
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

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => router.push(`/admin/prompts/${encodeURIComponent(key)}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            プロンプト詳細に戻る
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{promptName || key}</h1>
                <Badge variant="secondary">v{currentVersion}</Badge>
              </div>
              <p className="text-gray-600">バージョン履歴</p>
            </div>
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

        {/* バージョン一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-5 h-5" />
              バージョン一覧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((version, _index) => (
                <div
                  key={version.version}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    version.version === currentVersion
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                        version.version === currentVersion
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600",
                      )}
                    >
                      v{version.version}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {version.version === currentVersion && (
                          <Badge variant="default" className="text-xs">
                            現在
                          </Badge>
                        )}
                        {version.changeNote ? (
                          <span className="text-sm text-gray-700">{version.changeNote}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(version.createdAt)}
                        </span>
                        {version.changedBy && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.changedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/admin/prompts/${encodeURIComponent(key)}/history/${version.version}`,
                        )
                      }
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      内容を見る
                    </Button>
                    {version.version !== currentVersion && (
                      <Button variant="outline" size="sm" onClick={() => setRestoreTarget(version)}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        復元
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {versions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>バージョン履歴がありません</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 復元確認ダイアログ */}
        <Dialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>バージョンの復元</DialogTitle>
              <DialogDescription>
                バージョン {restoreTarget?.version} に戻します。 現在の内容はバージョン{" "}
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
              <Button variant="outline" onClick={() => setRestoreTarget(null)}>
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
