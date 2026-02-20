"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  PROVIDER_CONFIG, 
  DEFAULT_PROVIDER, 
  PROJECT_DEFAULT_PROVIDERS 
} from "@/lib/llm/config";
import { PROVIDER_COLORS } from "@/lib/llm/constants";
import type { LLMProvider } from "@/lib/llm/types";
import { 
  Cpu, 
  Settings, 
  FileText, 
  Mic, 
  Users, 
  Shield,
  Sparkles,
  CheckCircle,
  XCircle,
  DollarSign,
  ChevronRight,
  Activity,
  ScrollText,
  Bot,
} from "lucide-react";
import Link from "next/link";

// 機能の定義
const FEATURES = [
  {
    id: "PJ-A",
    name: "議事録作成",
    description: "Zoom文字起こしから議事録を自動生成",
    icon: FileText,
    path: "/meeting-notes",
  },
  {
    id: "PJ-B",
    name: "NA原稿作成",
    description: "Premiere Pro書き起こしからNA原稿を作成",
    icon: Mic,
    path: "/transcripts",
  },
  {
    id: "PJ-C-people",
    name: "出演者リサーチ",
    description: "企画に最適な出演者候補をリサーチ",
    icon: Users,
    path: "/chat?gem=research-cast",
  },
  {
    id: "PJ-C-evidence",
    name: "エビデンスリサーチ",
    description: "情報の真偽を検証・ファクトチェック",
    icon: Shield,
    path: "/chat?gem=research-evidence",
  },
  // PJ-D（ロケスケジュール）は削除
];

// プロバイダー情報を取得
function getProviderInfo(providerId: LLMProvider) {
  return PROVIDER_CONFIG[providerId];
}

// プロバイダーのバッジ色を取得
function getProviderBadgeColor(providerId: string): string {
  if (providerId.includes("grok")) return "bg-orange-100 text-orange-800 border-orange-200";
  if (providerId.includes("gemini")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (providerId.includes("gpt")) return "bg-green-100 text-green-800 border-green-200";
  if (providerId.includes("claude")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (providerId.includes("perplexity")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-gray-100 text-gray-800";
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <AdminLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  const defaultProviderInfo = getProviderInfo(DEFAULT_PROVIDER);

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">管理画面</h1>
            <p className="text-gray-500">システム設定とモデル構成</p>
          </div>
        </div>

        {/* 管理メニュー */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">ユーザー一覧</h3>
                      <p className="text-sm text-gray-500">登録ユーザーの管理</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/prompts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">プロンプト管理</h3>
                      <p className="text-sm text-gray-500">AIプロンプトの編集</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/usage">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">使用量・コスト</h3>
                      <p className="text-sm text-gray-500">API使用状況の監視</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/logs">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-gray-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <ScrollText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">アプリケーションログ</h3>
                      <p className="text-sm text-gray-500">システムログの閲覧</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">デフォルトモデル</h3>
                  <Badge className={`mt-1 ${getProviderBadgeColor(DEFAULT_PROVIDER)}`}>
                    {defaultProviderInfo.name}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Link href="/admin/grok-tools">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-indigo-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Grokツール設定</h3>
                      <p className="text-sm text-gray-500">Agent Tools APIの設定</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 機能別モデル設定 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            機能別モデル設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((feature) => {
              const providerId = PROJECT_DEFAULT_PROVIDERS[feature.id];
              const providerInfo = providerId ? getProviderInfo(providerId) : null;
              const Icon = feature.icon;

              return (
                <Card key={feature.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                          <span className="text-xs text-gray-400 font-mono">{feature.id}</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{feature.description}</p>
                        
                        {providerInfo ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">使用モデル:</span>
                            <Badge 
                              variant="outline"
                              className={getProviderBadgeColor(providerId)}
                            >
                              {providerInfo.name}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500">
                            未設定
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 利用可能なモデル一覧 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            利用可能なモデル
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {Object.values(PROVIDER_CONFIG).map((provider) => (
              <Card key={provider.id} className={!provider.isAvailable ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PROVIDER_COLORS[provider.id] }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                          {provider.isAvailable ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              利用可能
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              停止中
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{provider.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-gray-500">
                          <DollarSign className="w-4 h-4" />
                          入力
                        </div>
                        <div className="font-medium">${provider.inputPrice}/M tokens</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-gray-500">
                          <DollarSign className="w-4 h-4" />
                          出力
                        </div>
                        <div className="font-medium">${provider.outputPrice}/M tokens</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500">コンテキスト</div>
                        <div className="font-medium">{(provider.contextLength / 1000).toFixed(0)}k</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
