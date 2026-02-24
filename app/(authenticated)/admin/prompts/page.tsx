"use client";

import { useEffect, useState } from "react";

interface Prompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  currentVersion: number;
  updatedAt: string;
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
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
  }

  async function showDetails(prompt: Prompt) {
    setSelectedPrompt(prompt);
    setShowModal(true);
    
    try {
      const res = await fetch(`/api/prompts/${prompt.key}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">プロンプト管理</h1>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left">Key</th>
              <th className="border p-3 text-left">Name</th>
              <th className="border p-3 text-left">Category</th>
              <th className="border p-3 text-left">Version</th>
              <th className="border p-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((prompt) => (
              <tr
                key={prompt.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => showDetails(prompt)}
              >
                <td className="border p-3 font-mono text-sm">{prompt.key}</td>
                <td className="border p-3">{prompt.name}</td>
                <td className="border p-3">{prompt.category}</td>
                <td className="border p-3">{prompt.currentVersion}</td>
                <td className="border p-3 text-sm">
                  {new Date(prompt.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      {showModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedPrompt.key}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p>{selectedPrompt.name}</p>
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

                <div>
                  <h3 className="font-semibold mb-2">Versions</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border p-2 text-left">Version</th>
                        <th className="border p-2 text-left">Change Note</th>
                        <th className="border p-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v) => (
                        <tr key={v.version}>
                          <td className="border p-2">{v.version}</td>
                          <td className="border p-2">{v.changeNote || "-"}</td>
                          <td className="border p-2">
                            {new Date(v.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 pt-4">
                  <a
                    href={`/prompts/${selectedPrompt.key}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    編集
                  </a>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
