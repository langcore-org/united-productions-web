"use client";

import { ArrowLeft, Bot, CheckCircle2, Search, Settings, Terminal, Twitter } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TOOLS = [
  {
    id: "web_search",
    label: "Web検索",
    description: "インターネットから最新情報を検索",
    icon: Search,
    color: "text-blue-500",
  },
  {
    id: "x_search",
    label: "X検索",
    description: "X（Twitter）からリアルタイム情報を検索",
    icon: Twitter,
    color: "text-sky-500",
  },
  {
    id: "code_execution",
    label: "コード実行",
    description: "Pythonコードを安全なサンドボックスで実行",
    icon: Terminal,
    color: "text-green-500",
  },
];

export default function GrokToolsPage() {
  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                ツール有効化状況
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                <p className="text-sm text-indigo-900">
                  全機能で以下の3ツールが<strong>常時有効</strong>
                  です。AIが自律的にツールを選択して使用します。 機能別の個別設定は廃止されました。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TOOLS.map((tool) => (
                  <div
                    key={tool.id}
                    className="p-4 rounded-lg border border-gray-200 bg-white flex items-start gap-3"
                  >
                    <tool.icon className={`w-5 h-5 mt-0.5 ${tool.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{tool.label}</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
