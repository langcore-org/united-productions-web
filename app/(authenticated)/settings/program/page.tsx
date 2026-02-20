"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, Check } from "lucide-react";

export default function ProgramSettingsPage() {
  const [programInfo, setProgramInfo] = useState("");
  const [pastProposals, setPastProposals] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/program");
        if (response.ok) {
          const data = await response.json();
          setProgramInfo(data.programInfo || "");
          setPastProposals(data.pastProposals || "");
        } else {
          setError("設定の読み込みに失敗しました");
        }
      } catch {
        setError("設定の読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setIsSaved(false);

    try {
      const response = await fetch("/api/settings/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programInfo, pastProposals }),
      });

      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "保存に失敗しました");
      }
    } catch {
      setError("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">番組設定</h1>
        <p className="text-gray-600 mt-1">
          新企画立案機能で使用する番組情報と過去の企画を登録できます。
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-gray-100 border border-gray-200 text-gray-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 番組情報 */}
        <Card>
          <CardHeader>
            <CardTitle>番組情報</CardTitle>
            <CardDescription>
              番組のコンセプト、ターゲット視聴者、放送時間帯などを入力してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={programInfo}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProgramInfo(e.target.value)}
              placeholder={`例：
番組名：深夜のお悩み相談室
放送時間：毎週金曜 25:00-26:00
ターゲット：20代後半〜30代男女
コンセプト：視聴者からのお悩みメールを芸能人がアドバイスするバラエティ
進行：MC1名 + レギュラー3名
演出：スタジオ収録、メール読み上げVTRあり`}
              className="min-h-[200px] resize-y"
            />
          </CardContent>
        </Card>

        {/* 過去の企画 */}
        <Card>
          <CardHeader>
            <CardTitle>過去の企画一覧</CardTitle>
            <CardDescription>
              これまで放送した企画のタイトルと概要を入力してください。新企画立案時に重複を避けるために使用されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={pastProposals}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastProposals(e.target.value)}
              placeholder={`例：
・第1回「恋愛の悩み」視聴者からの恋愛相談に回答
・第2回「仕事の悩み」キャリアや人間関係の相談
・第3回「金銭の悩み」貯金できない、浪費癖など
・第4回「健康の悩み」ダイエット、睡眠の悩みなど`}
              className="min-h-[200px] resize-y"
            />
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : isSaved ? (
              <>
                <Check className="w-4 h-4" />
                保存完了
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
