"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  Bot,
  Search,
  Save,
  Terminal,
  FileSearch,
  Twitter,
  Settings,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// 機能の定義
const TOOL_FEATURES = [
  { key: "generalChat", label: "一般チャット" },
  { key: "researchCast", label: "出演者リサーチ" },
  { key: "researchLocation", label: "場所リサーチ" },
  { key: "researchInfo", label: "情報リサーチ" },
  { key: "researchEvidence", label: "エビデンスリサーチ" },
  { key: "minutes", label: "議事録作成" },
  { key: "proposal", label: "新企画立案" },
  { key: "naScript", label: "NA原稿作成" },
] as const;

// ツール定義（モノトーン統一）
const TOOLS = [
  {
    id: "webSearch" as const,
    name: "web_search",
    label: "Web検索",
    description: "インターネットから最新情報を検索",
    icon: Search,
  },
  {
    id: "xSearch" as const,
    name: "x_search",
    label: "X検索",
    description: "X（Twitter）からリアルタイム情報を検索",
    icon: Twitter,
  },
  {
    id: "codeExecution" as const,
    name: "code_execution",
    label: "コード実行",
    description: "Pythonコードを安全なサンドボックスで実行",
    icon: Terminal,
  },
  {
    id: "fileSearch" as const,
    name: "collections_search",
    label: "ファイル検索",
    description: "アップロードしたドキュメントを検索",
    icon: FileSearch,
  },
] as const;

type ToolId = typeof TOOLS[number]["id"];
type FeatureKey = typeof TOOL_FEATURES[number]["key"];

type GrokToolSettings = Record<`${ToolId}${Capitalize<FeatureKey>}`, boolean>;

export default function GrokToolsPage() {
  const [mounted, setMounted] = useState(false);
  const [grokSettings, setGrokSettings] = useState<GrokToolSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/settings/grok-tools");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: 設定の取得に失敗しました`);
      }
      
      const data = await response.json();
      
      // データが空または無効な場合はエラー
      if (!data || typeof data !== 'object') {
        throw new Error('設定データが無効です');
      }
      
      setGrokSettings(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '設定の取得中にエラーが発生しました';
      setError(errorMessage);
      console.error("Failed to fetch Grok tool settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof GrokToolSettings, value: boolean) => {
    if (!grokSettings) return;
    setGrokSettings((prev) => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleSave = async () => {
    if (!grokSettings) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await fetch("/api/settings/grok-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grokSettings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '保存に失敗しました');
      }

      setSaveMessage("保存しました");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存に失敗しました';
      setSaveMessage(errorMessage);
      console.error("Failed to save Grok tool settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // エラー表示
  if (error) {
    return (
      <AdminLayout>
        <div className="h-full overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* ヘッダー */}
            <div className="flex items-center gap-4 mb-8">
              <Link
                href="/admin"
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Grokツール設定</h1>
                <p className="text-gray-500">Agent Tools APIの有効化設定</p>
              </div>
            </div>

            {/* エラーカード */}
            <Card className="border-red-200">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    設定の取得に失敗しました
                  </h2>
                  <p className="text-gray-600 mb-6 max-w-md">
                    {error}
                  </p>
                  <button
                    onClick={fetchSettings}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    再試行
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ローディング表示
  if (isLoading || !grokSettings) {
    return (
      <AdminLayout>
        <div className="h-full overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* ヘッダー */}
            <div className="flex items-center gap-4 mb-8">
              <Link
                href="/admin"
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Grokツール設定</h1>
                <p className="text-gray-500">Agent Tools APIの有効化設定</p>
              </div>
            </div>

            {/* ローディングカード */}
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                  <p className="text-gray-600">設定を読み込んでいます...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* ヘッダー */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grokツール設定</h1>
              <p className="text-gray-500">Agent Tools APIの有効化設定</p>
            </div>
          </div>

          {/* 設定カード */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                機能別ツール設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                  <p className="text-sm text-indigo-900">
                    Grokモデル使用時に、各機能でAgent Toolsを有効にすると、
                    AIが自律的にツールを使いこなして回答を生成します。
                    この設定は<strong>全ユーザーに適用</strong>されます。
                  </p>
                </div>

                {/* ツール別設定テーブル */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">機能</th>
                        {TOOLS.map((tool) => (
                          <th key={tool.id} className="text-center py-3 px-2 text-sm font-medium text-gray-700 min-w-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              <tool.icon className="w-4 h-4 text-gray-600" />
                              <span>{tool.label}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TOOL_FEATURES.map((feature) => (
                        <tr key={feature.key} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900">{feature.label}</span>
                          </td>
                          {TOOLS.map((tool) => {
                            const settingKey = `${tool.id}${feature.key.charAt(0).toUpperCase() + feature.key.slice(1)}` as keyof GrokToolSettings;
                            const isEnabled = grokSettings[settingKey] ?? false;
                            return (
                              <td key={tool.id} className="py-3 px-2 text-center">
                                <button
                                  onClick={() => updateSetting(settingKey, !isEnabled)}
                                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                                    isEnabled 
                                      ? "bg-gray-900" 
                                      : "bg-gray-200"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                                      isEnabled ? "translate-x-5" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ツール説明 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  {TOOLS.map((tool) => (
                    <div key={tool.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <tool.icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">{tool.label}</span>
                      </div>
                      <p className="text-xs text-gray-600">{tool.description}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    {saveMessage && (
                      <span className={`text-sm ${
                        saveMessage === "保存しました" ? "text-green-600" : "text-red-600"
                      }`}>
                        {saveMessage}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        設定を保存
                      </>
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
