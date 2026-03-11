"use client";

import {
  Activity,
  CheckCircle,
  ChevronRight,
  Cpu,
  DollarSign,
  FileText,
  Mic,
  Settings,
  Shield,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getProviderBadgeStyle, STYLES } from "@/lib/admin-styles";
import { DEFAULT_PROVIDER, PROJECT_DEFAULT_PROVIDERS, PROVIDER_CONFIG } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";

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
    path: "/chat?agent=research-cast",
  },
  {
    id: "PJ-C-evidence",
    name: "エビデンスリサーチ",
    description: "情報の真偽を検証・ファクトチェック",
    icon: Shield,
    path: "/chat?agent=research-evidence",
  },
];

// 管理メニュー定義
const ADMIN_MENU = [
  {
    href: "/admin/users",
    icon: Users,
    label: "ユーザー一覧",
    description: "登録ユーザーの管理",
    borderColor: "gray",
  },
  {
    href: "/admin/prompts",
    icon: FileText,
    label: "プロンプト管理",
    description: "AIプロンプトの編集",
    borderColor: "gray",
  },
  {
    href: "/admin/usage",
    icon: Activity,
    label: "使用量・コスト",
    description: "API使用状況の監視",
    borderColor: "gray",
  },
];

// プロバイダー情報を取得
function getProviderInfo(providerId: LLMProvider) {
  return PROVIDER_CONFIG[providerId];
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
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
            <div className={STYLES.headerIcon}>
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理画面</h1>
              <p className="text-gray-500">システム設定とモデル構成</p>
            </div>
          </div>

          {/* 管理メニュー */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADMIN_MENU.map((menu) => (
              <Link key={menu.href} href={menu.href}>
                <Card className={`${STYLES.cardHover} border-l-4 border-l-gray-500`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={STYLES.menuIcon}>
                          <menu.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{menu.label}</h3>
                          <p className="text-sm text-gray-500">{menu.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* デフォルトモデル情報 */}
            <Card className="border-l-4 border-l-gray-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={STYLES.menuIcon}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">デフォルトモデル</h3>
                    <Badge className={`mt-1 ${getProviderBadgeStyle(DEFAULT_PROVIDER)}`}>
                      {defaultProviderInfo.name}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  <Card key={feature.id} className={STYLES.cardHover}>
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
                                className={getProviderBadgeStyle(providerId)}
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
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                            {provider.isAvailable ? (
                              <Badge className="bg-gray-100 text-gray-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                利用可能
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-500">
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
                          <div className="font-medium">
                            {(provider.contextLength / 1000).toFixed(0)}k
                          </div>
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
