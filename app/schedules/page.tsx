"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Users,
  Car,
  ClipboardList,
  Sparkles,
  Download,
  FileText,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  ScheduleGenerateType,
  getGenerateTypeLabel,
  getGenerateTypeDescription,
} from "@/prompts/schedule-generate";

/**
 * タブタイプ
 */
type TabType = "master" | "actor" | "staff" | "vehicle";

/**
 * 生成結果
 */
interface GenerateResult {
  type: ScheduleGenerateType;
  content: string;
  timestamp: Date;
}

/**
 * ローディング状態
 */
interface LoadingState {
  actor: boolean;
  staff: boolean;
  vehicle: boolean;
}

/**
 * デフォルトのマスタースケジュールテンプレート
 */
const DEFAULT_MASTER_TEMPLATE = `【ロケスケジュール】

■ 日付: 2026/MM/DD(曜日)
■ 現場名: 
■ 収録内容: 
■ 担当AP: 
■ 担当AD: 

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【集合】
■ スタッフ集合: 
  時刻: 
  場所: 

■ 演者集合: 
  時刻: 
  場所: 
  演者: 

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【車両】
■ 1号車: 
  運転手: 
  乗車人员: 
  行程: 

■ 2号車: 
  運転手: 
  乗車人员: 
  行程: 

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【スケジュール】

□ 09:00 スタッフ集合・機材積み込み
□ 10:00 現場到着・設営
□ 11:00 リハーサル
□ 12:00 昼食
□ 13:00 本番収録開始
□ 17:00 収録終了・撤収
□ 18:00 事務所到着

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【注意事項】
- 
- 
- 
`;

export default function SchedulesPage() {
  // 状態管理
  const [activeTab, setActiveTab] = useState<TabType>("master");
  const [masterSchedule, setMasterSchedule] = useState(DEFAULT_MASTER_TEMPLATE);
  const [generateResults, setGenerateResults] = useState<Record<ScheduleGenerateType, string>>({
    actor: "",
    staff: "",
    vehicle: "",
  });
  const [loading, setLoading] = useState<LoadingState>({
    actor: false,
    staff: false,
    vehicle: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * スケジュール自動生成
   */
  const handleGenerate = useCallback(async (type: ScheduleGenerateType) => {
    if (!masterSchedule.trim()) {
      setError("マスタースケジュールを入力してください");
      return;
    }

    setLoading((prev) => ({ ...prev, [type]: true }));
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/schedules?action=generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterSchedule,
          type,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "生成に失敗しました");
      }

      setGenerateResults((prev) => ({
        ...prev,
        [type]: data.data.content,
      }));

      setSuccess(`${getGenerateTypeLabel(type)}を生成しました`);

      // 生成したタブに切り替え
      setActiveTab(type);
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
      setError(message);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  }, [masterSchedule]);

  /**
   * エクスポート
   */
  const handleExport = useCallback(async (format: "markdown" | "csv") => {
    const content = activeTab === "master" 
      ? masterSchedule 
      : generateResults[activeTab as ScheduleGenerateType];

    if (!content) {
      setError("エクスポートするコンテンツがありません");
      return;
    }

    try {
      const response = await fetch(`/api/schedules?action=export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          format,
          filename: `schedule_${activeTab}_${new Date().toISOString().split("T")[0]}`,
        }),
      });

      if (!response.ok) {
        throw new Error("エクスポートに失敗しました");
      }

      // ダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schedule_${activeTab}.${format === "csv" ? "csv" : "md"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(`${format.toUpperCase()}形式でダウンロードしました`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
      setError(message);
    }
  }, [activeTab, masterSchedule, generateResults]);

  /**
   * マスタースケジュールをクリア
   */
  const handleClear = useCallback(() => {
    if (confirm("マスタースケジュールをクリアしますか？")) {
      setMasterSchedule("");
      setGenerateResults({ actor: "", staff: "", vehicle: "" });
      setSuccess("マスタースケジュールをクリアしました");
    }
  }, []);

  /**
   * タブアイコン取得
   */
  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case "master":
        return <ClipboardList className="w-4 h-4" />;
      case "actor":
        return <Users className="w-4 h-4" />;
      case "staff":
        return <Calendar className="w-4 h-4" />;
      case "vehicle":
        return <Car className="w-4 h-4" />;
    }
  };

  /**
   * タブラベル取得
   */
  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case "master":
        return "マスター";
      case "actor":
        return "演者別";
      case "staff":
        return "香盤表";
      case "vehicle":
        return "車両表";
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-gray-100">
      {/* Header */}
      <header className="border-b border-[#2a2a35] bg-[#1a1a24]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">ロケスケ管理</h1>
              <p className="text-sm text-gray-400 mt-1">
                マスタースケジュールから自動生成
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport("markdown")}
                disabled={!masterSchedule && !generateResults[activeTab as ScheduleGenerateType]}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  "border border-[#2a2a35] bg-[#1a1a24]",
                  "hover:border-[#ff6b00]/50 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <FileText className="w-4 h-4" />
                Markdown
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={!masterSchedule && !generateResults[activeTab as ScheduleGenerateType]}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  "border border-[#2a2a35] bg-[#1a1a24]",
                  "hover:border-[#ff6b00]/50 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-t border-[#2a2a35]">
          {(["master", "actor", "staff", "vehicle"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium",
                "border-b-2 transition-colors",
                activeTab === tab
                  ? "border-[#ff6b00] text-[#ff6b00]"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              )}
            >
              {getTabIcon(tab)}
              {getTabLabel(tab)}
              {tab !== "master" && generateResults[tab as ScheduleGenerateType] && (
                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Alerts */}
      {(error || success) && (
        <div className="px-6 py-3">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Master Schedule */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#ff6b00]" />
                マスタースケジュール
              </h2>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                クリア
              </button>
            </div>

            <div className="relative">
              <textarea
                value={masterSchedule}
                onChange={(e) => setMasterSchedule(e.target.value)}
                placeholder="マスタースケジュールを入力してください..."
                className={cn(
                  "w-full h-[calc(100vh-280px)] min-h-[400px] p-4 rounded-xl",
                  "bg-[#1a1a24] border border-[#2a2a35]",
                  "text-sm text-gray-200 placeholder-gray-600",
                  "focus:outline-none focus:border-[#ff6b00]/50",
                  "resize-none font-mono leading-relaxed"
                )}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                {masterSchedule.length} 文字
              </div>
            </div>

            {/* Generate Buttons */}
            <div className="grid grid-cols-3 gap-3">
              {(["actor", "staff", "vehicle"] as ScheduleGenerateType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleGenerate(type)}
                  disabled={loading[type] || !masterSchedule.trim()}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl",
                    "bg-[#1a1a24] border border-[#2a2a35]",
                    "hover:border-[#ff6b00]/50 transition-all",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "group"
                  )}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#ff6b00]/10 group-hover:bg-[#ff6b00]/20 transition-colors">
                    {loading[type] ? (
                      <Loader2 className="w-5 h-5 text-[#ff6b00] animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-[#ff6b00]" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-200">
                      {getGenerateTypeLabel(type)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {getGenerateTypeDescription(type)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                {getTabIcon(activeTab)}
                <span className={activeTab === "master" ? "text-[#ff6b00]" : ""}>
                  {getTabLabel(activeTab)}
                </span>
                {activeTab !== "master" && (
                  <span className="text-xs text-gray-500">
                    （自動生成）
                  </span>
                )}
              </h2>
            </div>

            <div
              className={cn(
                "h-[calc(100vh-200px)] min-h-[500px] rounded-xl overflow-hidden",
                "bg-[#1a1a24] border border-[#2a2a35]"
              )}
            >
              {activeTab === "master" ? (
                // Master Preview
                <div className="h-full p-4 overflow-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {masterSchedule || (
                      <span className="text-gray-600">
                        マスタースケジュールを入力してください...
                      </span>
                    )}
                  </pre>
                </div>
              ) : (
                // Generated Content Preview
                <div className="h-full flex flex-col">
                  {generateResults[activeTab] ? (
                    <>
                      <div className="flex-1 p-4 overflow-auto">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {generateResults[activeTab]}
                        </pre>
                      </div>
                      <div className="px-4 py-2 border-t border-[#2a2a35] bg-[#0d0d12]">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {generateResults[activeTab].length} 文字
                          </span>
                          <button
                            onClick={() => handleExport("markdown")}
                            className="flex items-center gap-1 text-[#ff6b00] hover:text-[#ff8533] transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            ダウンロード
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                      <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-sm">
                        「{getGenerateTypeLabel(activeTab)}」ボタンをクリックして生成
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
