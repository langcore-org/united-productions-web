"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Prompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  currentVersion: number;
  updatedAt: string;
}

interface PromptContent {
  key: string;
  content: string;
  version: number;
}

interface Version {
  version: number;
  changeNote: string | null;
  changedBy: string | null;
  createdAt: string;
}

export default function AdminPromptsV2Page() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptContent, setPromptContent] = useState<PromptContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch("/api/prompts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  async function handleRowClick(prompt: Prompt) {
    setSelectedPrompt(prompt);
    setIsModalOpen(true);
    setLoadingVersions(true);
    setLoadingContent(true);
    setVersions([]);
    setPromptContent(null);

    try {
      const [versionsRes, contentRes] = await Promise.all([
        fetch(`/api/prompts/${prompt.key}/versions`),
        fetch(`/api/prompts/${prompt.key}`),
      ]);

      if (versionsRes.ok) {
        const versionsData = await versionsRes.json();
        setVersions(versionsData.versions || []);
      }

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        setPromptContent(contentData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVersions(false);
      setLoadingContent(false);
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedPrompt(null);
    setPromptContent(null);
    setVersions([]);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">プロンプト管理 v2</h1>

          {/* プロンプト一覧テーブル */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>バージョン</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow
                    key={prompt.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(prompt)}
                  >
                    <TableCell className="font-medium">{prompt.name}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-500">
                      {prompt.key}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{prompt.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>v{prompt.currentVersion}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 詳細モーダル */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedPrompt?.name}
                </DialogTitle>
              </DialogHeader>

              {selectedPrompt && (
                <div className="space-y-6 mt-4">
                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Key:</span>
                      <p className="font-mono">{selectedPrompt.key}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <p>{selectedPrompt.category}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Current Version:</span>
                      <p>{selectedPrompt.currentVersion}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span>
                      <p>{new Date(selectedPrompt.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* プロンプト内容 */}
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">プロンプト内容</h3>
                    {loadingContent ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : promptContent ? (
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                          {promptContent.content}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">内容を読み込めませんでした</p>
                    )}
                  </div>

                  {/* バージョン履歴 */}
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">バージョン履歴</h3>
                    {loadingVersions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Version</th>
                              <th className="px-4 py-2 text-left">Change Note</th>
                              <th className="px-4 py-2 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {versions.map((v) => (
                              <tr
                                key={v.version}
                                className={
                                  v.version === selectedPrompt.currentVersion
                                    ? "bg-blue-50"
                                    : ""
                                }
                              >
                                <td className="px-4 py-2">
                                  v{v.version}
                                  {v.version === selectedPrompt.currentVersion && (
                                    <Badge className="ml-2" variant="default">
                                      current
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-2">{v.changeNote || "-"}</td>
                                <td className="px-4 py-2 text-gray-500">
                                  {new Date(v.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 編集ボタン */}
                  <div className="flex gap-2 pt-4">
                    <a
                      href={`/admin/prompts/${selectedPrompt.key}`}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      編集
                    </a>
                    <Button variant="outline" onClick={handleCloseModal}>
                      閉じる
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
}
