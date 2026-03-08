"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { PageHeader } from "@/components/layout";
import {
  CheckCircle2,
  HardDrive,
  Loader2,
  RefreshCw,
  Unlink,
  Upload,
  FileJson,
  AlertCircle,
  X,
  TestTube,
  XCircle,
  MessageSquare,
  FileOutput,
  Search,
  Shield,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface DriveSettings {
  rootFolderId?: string;
  outputFolderId?: string;
}

interface WorkspaceData {
  id: string;
  google_drive_connected: boolean;
  drive_settings: DriveSettings | null;
}

interface SharedDrive {
  id: string;
  name: string;
}

interface TestResult {
  success: boolean;
  clientEmail?: string;
  sharedDrives?: SharedDrive[];
  rootFolderAccess?: {
    accessible: boolean;
    name?: string;
    fileCount?: number;
  };
  outputFolderAccess?: {
    accessible: boolean;
    name?: string;
    writable?: boolean;
  };
  error?: string;
  errorDetails?: string;
}

interface CacheStats {
  totalCached: number;
  expiredCount: number;
  lastUpdated: string | null;
}

export default function GoogleDriveSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdatingCache, setIsUpdatingCache] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [clientEmail, setClientEmail] = useState<string>("");

  // UI state
  const [showGuide, setShowGuide] = useState(true);

  // Fetch cache stats
  const fetchCacheStats = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(
        `/api/workspace/drive/cache?workspaceId=${workspaceId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch cache stats:", error);
    }
  }, []);

  // Fetch workspace data
  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("workspaces")
          .select("id, google_drive_connected, drive_settings")
          .eq("slug", slug)
          .single();

        if (error) throw error;

        setWorkspace(data);

        // Fetch cache stats if connected
        if (data?.google_drive_connected && data?.id) {
          fetchCacheStats(data.id);
        }
      } catch (error) {
        console.error("Failed to fetch workspace:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspace();
  }, [slug, fetchCacheStats]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset state
      setValidationError("");
      setValidationSuccess(false);
      setClientEmail("");

      // Check file type
      if (!file.name.endsWith(".json")) {
        setValidationError("JSONファイルを選択してください");
        return;
      }

      setSelectedFile(file);

      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);

        // Validate JSON
        try {
          const json = JSON.parse(content);

          // Check required fields
          const requiredFields = [
            "type",
            "project_id",
            "private_key",
            "client_email",
          ];
          const missingFields = requiredFields.filter((f) => !json[f]);

          if (missingFields.length > 0) {
            setValidationError(
              `必須フィールドがありません: ${missingFields.join(", ")}`
            );
            return;
          }

          if (json.type !== "service_account") {
            setValidationError(
              "無効なファイル: type が 'service_account' ではありません"
            );
            return;
          }

          if (
            !json.client_email.includes("@") ||
            !json.client_email.includes(".iam.gserviceaccount.com")
          ) {
            setValidationError("無効な client_email 形式です");
            return;
          }

          // Success
          setValidationSuccess(true);
          setClientEmail(json.client_email);
        } catch {
          setValidationError("無効なJSONファイルです");
        }
      };
      reader.readAsText(file);
    },
    []
  );

  // Handle upload
  const handleUpload = async () => {
    if (!workspace || !fileContent || !validationSuccess) return;

    setIsUploading(true);
    try {
      const response = await fetch("/api/workspace/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          serviceAccountJson: fileContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setValidationError(data.error || "アップロードに失敗しました");
        return;
      }

      // Success - update local state
      setWorkspace({
        ...workspace,
        google_drive_connected: true,
      });
      setSelectedFile(null);
      setFileContent("");
    } catch (error) {
      console.error("Upload error:", error);
      setValidationError("アップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!workspace) return;

    try {
      const response = await fetch("/api/workspace/drive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });

      if (response.ok) {
        setWorkspace({
          ...workspace,
          google_drive_connected: false,
          drive_settings: null,
        });
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  // Handle sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // TODO: Implement sync
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle cache update
  const handleUpdateCache = async () => {
    if (!workspace) return;

    setIsUpdatingCache(true);
    try {
      const response = await fetch("/api/workspace/drive/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.stats) {
          setCacheStats({
            ...data.stats,
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Cache update error:", error);
    } finally {
      setIsUpdatingCache(false);
    }
  };

  // Handle connection test
  const handleConnectionTest = async () => {
    if (!workspace) return;

    setIsTesting(true);
    setTestResult(null);
    setShowTestDialog(true);

    try {
      const response = await fetch("/api/workspace/drive/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error("Connection test error:", error);
      setTestResult({
        success: false,
        error: "接続テストに失敗しました",
        errorDetails: "ネットワークエラーが発生しました",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFileContent("");
    setValidationError("");
    setValidationSuccess(false);
    setClientEmail("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Disconnected state - show upload UI
  if (!workspace?.google_drive_connected) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Google Drive連携"
          description="Service Accountを使用してGoogle Driveと連携します"
        />

        {/* Guide Section */}
        <Card className="mb-6 overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50 to-teal-50 dark:border-blue-900 dark:from-blue-950/30 dark:to-teal-950/30">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <HardDrive className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  なぜGoogle Drive連携が必要？
                </h3>
                <p className="text-sm text-muted-foreground">
                  連携のメリットと設定手順を確認
                </p>
              </div>
            </div>
            {showGuide ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showGuide && (
            <div className="border-t px-4 pb-6">
              {/* Hero Image */}
              <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg">
                <Image
                  src="/images/guides/drive/hero-drive-connection.png"
                  alt="Google Drive連携"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Benefits Section */}
              <div className="mt-6 space-y-4">
                <h4 className="flex items-center gap-2 font-semibold text-foreground">
                  <Search className="h-4 w-4 text-blue-600" />
                  連携するとできること
                </h4>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-white/60 p-4 dark:bg-gray-900/40">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
                      <MessageSquare className="h-5 w-5 text-teal-600" />
                    </div>
                    <h5 className="font-medium">@メンションで参照</h5>
                    <p className="mt-1 text-sm text-muted-foreground">
                      チャットで <code className="rounded bg-muted px-1">@ファイル名</code> と入力するだけでDriveのファイルを参照できます
                    </p>
                  </div>

                  <div className="rounded-lg border bg-white/60 p-4 dark:bg-gray-900/40">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <FileOutput className="h-5 w-5 text-green-600" />
                    </div>
                    <h5 className="font-medium">成果物を自動保存</h5>
                    <p className="mt-1 text-sm text-muted-foreground">
                      AIが作成した構成案やドキュメントを指定フォルダに自動で保存します
                    </p>
                  </div>

                  <div className="rounded-lg border bg-white/60 p-4 dark:bg-gray-900/40">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <Search className="h-5 w-5 text-blue-600" />
                    </div>
                    <h5 className="font-medium">横断検索</h5>
                    <p className="mt-1 text-sm text-muted-foreground">
                      過去の企画書や議事録から関連情報を自動で検索・引用します
                    </p>
                  </div>
                </div>
              </div>

              {/* Setup Steps */}
              <div className="mt-8 space-y-4">
                <h4 className="flex items-center gap-2 font-semibold text-foreground">
                  <Shield className="h-4 w-4 text-blue-600" />
                  セットアップの流れ
                </h4>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4 rounded-lg border bg-white/60 p-4 dark:bg-gray-900/40">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      1
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium">Google Cloud Consoleでプロジェクトを作成</h5>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Google Cloud Consoleにアクセスし、新しいプロジェクトを作成します。
                        Drive API、Docs API、Sheets APIを有効化してください。
                      </p>
                      <a
                        href="https://console.cloud.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        Google Cloud Console
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 rounded-lg border bg-white/60 p-4 dark:bg-gray-900/40">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex-1">
                          <h5 className="font-medium">Service Accountを作成</h5>
                          <p className="mt-1 text-sm text-muted-foreground">
                            「IAMと管理」→「サービスアカウント」から新規作成し、
                            JSONキーファイルをダウンロードします。
                          </p>
                        </div>
                        <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg sm:h-20">
                          <Image
                            src="/images/guides/drive/step-2-service-account.png"
                            alt="Service Account作成"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 rounded-lg border bg-white/60 p-4 dark:bg-gray-900/40">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex-1">
                          <h5 className="font-medium">対象フォルダをService Accountに共有</h5>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Google Driveで参照したいフォルダを開き、Service Accountのメールアドレス
                            <span className="rounded bg-muted px-1 text-xs">xxx@xxx.iam.gserviceaccount.com</span>
                            を「共有」に追加します。
                          </p>
                        </div>
                        <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg sm:h-20">
                          <Image
                            src="/images/guides/drive/step-3-share-folder.png"
                            alt="フォルダ共有"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 rounded-lg border bg-white/60 p-4 dark:bg-gray-900/40">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      4
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium">JSONファイルをアップロード</h5>
                      <p className="mt-1 text-sm text-muted-foreground">
                        下のアップロードエリアにダウンロードしたJSONファイルをドラッグ＆ドロップ。
                        フォルダIDを設定して「連携を開始する」をクリックすれば完了です。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="mt-6 rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-900 dark:bg-green-950/20">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <div>
                    <h5 className="font-medium text-green-800 dark:text-green-400">
                      セキュリティについて
                    </h5>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-500">
                      Service Account JSONは暗号化して保存されます。アクセスできるのは明示的に共有したフォルダのみで、
                      個人のGoogle Driveにはアクセスしません。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Service Account設定</CardTitle>
            <CardDescription>
              Google Cloud
              ConsoleでService Accountを作成し、JSONキーファイルをアップロードしてください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                validationSuccess
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : validationError
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 cursor-pointer opacity-0"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <FileJson
                      className={`h-8 w-8 ${validationSuccess ? "text-green-600" : "text-muted-foreground"}`}
                    />
                    <span className="font-medium">{selectedFile.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSelectedFile();
                      }}
                      className="ml-2 rounded-full p-1 hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {validationSuccess && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>有効なService Accountファイル</span>
                    </div>
                  )}

                  {clientEmail && (
                    <p className="text-sm text-muted-foreground">
                      {clientEmail}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">
                    JSONファイルをドラッグ＆ドロップ
                  </p>
                  <p className="text-sm text-muted-foreground">
                    またはクリックしてファイルを選択
                  </p>
                </div>
              )}
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-950/20">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{validationError}</span>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!validationSuccess || isUploading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              連携を開始する
            </Button>

            {/* Help Text */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">セットアップ手順:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Google Cloud Consoleでプロジェクトを作成</li>
                <li>Drive API / Docs API / Sheets APIを有効化</li>
                <li>Service Accountを作成し、JSONキーを発行</li>
                <li>対象フォルダをService Accountのメールアドレスに共有</li>
                <li>このページでJSONファイルをアップロード</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected state
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Google Drive連携"
        description="Google Driveと連携してファイルを参照・出力できます"
      />

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">接続状態</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Service Accountで接続済み</span>
          </div>
          <p className="text-sm text-muted-foreground">
            参照フォルダは番組ごと、出力フォルダはチームごとに設定します。
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleConnectionTest}
              disabled={isTesting}
              className="w-full sm:w-auto"
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              接続テスト
            </Button>
            <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="w-full sm:w-auto">
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              今すぐ同期
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Unlink className="mr-2 h-4 w-4" />
                  連携を解除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>連携を解除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    Google
                    Driveとの連携を解除すると、チャットでのファイル参照や成果物の出力ができなくなります。Service
                    Account情報も削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect}>
                    連携を解除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Cache Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">キャッシュ設定</CardTitle>
          <CardDescription>
            @メンション用のファイルキャッシュを管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p>
              キャッシュ済みフォルダ:{" "}
              <span className="font-medium">
                {cacheStats ? cacheStats.totalCached : "--"}
              </span>
              {cacheStats && cacheStats.expiredCount > 0 && (
                <span className="ml-2 text-muted-foreground">
                  (期限切れ: {cacheStats.expiredCount})
                </span>
              )}
            </p>
            <p className="text-muted-foreground">
              最終更新:{" "}
              {cacheStats?.lastUpdated
                ? new Date(cacheStats.lastUpdated).toLocaleString("ja-JP")
                : "--"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleUpdateCache}
            disabled={isUpdatingCache}
          >
            {isUpdatingCache ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            キャッシュを更新
          </Button>
        </CardContent>
      </Card>

      {/* Connection Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isTesting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  接続テスト中...
                </>
              ) : testResult?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  接続テスト成功
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  接続テスト失敗
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isTesting
                ? "Google Drive APIへの接続を確認しています..."
                : testResult?.success
                  ? "Google Driveへの接続に成功しました"
                  : testResult?.error || "接続に失敗しました"}
            </DialogDescription>
          </DialogHeader>

          {!isTesting && testResult && (
            <div className="space-y-4">
              {/* Client Email */}
              {testResult.clientEmail && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Service Account
                  </p>
                  <p className="text-sm font-mono break-all">
                    {testResult.clientEmail}
                  </p>
                </div>
              )}

              {/* Shared Drives */}
              {testResult.sharedDrives && testResult.sharedDrives.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    アクセス可能な共有ドライブ:
                  </p>
                  <ul className="space-y-1">
                    {testResult.sharedDrives.map((drive) => (
                      <li
                        key={drive.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        {drive.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Root Folder Access */}
              {testResult.rootFolderAccess !== undefined && (
                <div className="flex items-center gap-2">
                  {testResult.rootFolderAccess.accessible ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    参照フォルダ:{" "}
                    {testResult.rootFolderAccess.accessible
                      ? testResult.rootFolderAccess.name || "アクセス可能"
                      : "アクセス不可"}
                  </span>
                </div>
              )}

              {/* Output Folder Access */}
              {testResult.outputFolderAccess !== undefined && (
                <div className="flex items-center gap-2">
                  {testResult.outputFolderAccess.accessible ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    出力フォルダ:{" "}
                    {testResult.outputFolderAccess.accessible
                      ? `${testResult.outputFolderAccess.name || "アクセス可能"}${
                          testResult.outputFolderAccess.writable
                            ? " (書き込み可)"
                            : " (読み取りのみ)"
                        }`
                      : "アクセス不可"}
                  </span>
                </div>
              )}

              {/* Error Details */}
              {testResult.errorDetails && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20">
                  <p className="font-medium">エラー詳細:</p>
                  <p className="mt-1">{testResult.errorDetails}</p>
                </div>
              )}

              {/* Troubleshooting */}
              {!testResult.success && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium text-foreground">解決方法:</p>
                  <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
                    <li>Google Driveで対象フォルダを開く</li>
                    <li>
                      Service Accountのメールアドレスを「共有」に追加
                    </li>
                    <li>適切な権限（閲覧者/編集者）を付与</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowTestDialog(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
