"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Mic,
  MessageSquare,
  Save,
  Edit3,
  Loader2,
  X,
  ChevronLeft,
} from "lucide-react";

// プロンプトカテゴリ
const CATEGORIES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  general: { label: "一般", icon: MessageSquare, color: "bg-gray-100 text-gray-800" },
  minutes: { label: "議事録", icon: FileText, color: "bg-purple-100 text-purple-800" },
  transcript: { label: "起こし・NA", icon: Mic, color: "bg-teal-100 text-teal-800" },
  research: { label: "リサーチ", icon: Search, color: "bg-pink-100 text-pink-800" },
  document: { label: "ドキュメント", icon: FileText, color: "bg-orange-100 text-orange-800" },
  // schedule: { label: "ロケスケ", icon: Calendar, color: "bg-green-100 text-green-800" }, // 削除
};

interface Prompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  content: string;
  category: string;
  isActive: boolean;
  updatedAt: string;
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // プロンプト一覧を取得
  const fetchPrompts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/prompts");
      const result = await response.json();
      if (result.success) {
        setPrompts(result.data);
      } else {
        const errorDetail = result.details ? ` (${result.details})` : "";
        setMessage({ 
          type: "error", 
          text: `プロンプトの取得に失敗しました${errorDetail}` 
        });
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
      setMessage({ 
        type: "error", 
        text: "プロンプトの取得に失敗しました（ネットワークエラー）" 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // メッセージを自動消去
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // プロンプトを編集
  const handleEdit = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setEditContent(prompt.content);
    setEditName(prompt.name);
    setEditDescription(prompt.description || "");
  };

  // プロンプトを保存
  const handleSave = async () => {
    if (!selectedPrompt) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/prompts?key=${selectedPrompt.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent,
          name: editName,
          description: editDescription,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: "プロンプトを更新しました" });
        setSelectedPrompt(null);
        fetchPrompts();
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
      setMessage({ type: "error", text: "プロンプトの保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  };

  // フィルタリングされたプロンプト
  const filteredPrompts = prompts.filter(
    (p) =>
      (activeCategory === "all" || p.category === activeCategory) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  // 編集モード
  if (selectedPrompt) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedPrompt(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  戻る
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">プロンプト編集</h1>
                  <p className="text-sm text-gray-500">
                    キー: <code className="bg-gray-100 px-1 rounded text-xs">{selectedPrompt.key}</code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setSelectedPrompt(null)}>
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 編集フォーム */}
        <div className="max-w-7xl mx-auto p-6">
          {message && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">名前</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">説明</label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1"
                    placeholder="プロンプトの説明を入力..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">プロンプト内容</label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="mt-1 font-mono text-sm min-h-[600px]"
                    placeholder="プロンプト内容を入力..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 一覧モード
  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">プロンプト管理</h1>
                <p className="text-gray-500">AIモデルに使用するプロンプトの編集</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="プロンプトを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* カテゴリフィルタ */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
            >
              全て
            </Button>
            {Object.entries(CATEGORIES).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant={activeCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(key)}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {config.label}
                </Button>
              );
            })}
          </div>

          {/* プロンプト一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrompts.map((prompt) => {
              const categoryConfig = CATEGORIES[prompt.category] || CATEGORIES.general;
              const Icon = categoryConfig.icon;
              const preview = (prompt.content || "").slice(0, 100).replace(/\n/g, " ") + "...";

              return (
                <Card
                  key={prompt.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEdit(prompt)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={categoryConfig.color}>{categoryConfig.label}</Badge>
                      {!prompt.isActive && (
                        <Badge variant="outline" className="text-gray-400">
                          無効
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{prompt.name}</h3>

                    {prompt.description && (
                      <p className="text-sm text-gray-500 mb-2">{prompt.description}</p>
                    )}

                    <p className="text-xs text-gray-400 font-mono mb-2">{prompt.key}</p>

                    <p className="text-sm text-gray-600 line-clamp-2">{preview}</p>

                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      更新: {new Date(prompt.updatedAt).toLocaleString("ja-JP")}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredPrompts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>プロンプトが見つかりません</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
