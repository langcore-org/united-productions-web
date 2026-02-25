"use client";

import { FileText, MessageSquare, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/FileUpload";

// FeatureChatを動的インポート
const FeatureChat = dynamic(
  () => import("@/components/ui/FeatureChat").then((mod) => mod.FeatureChat),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    ),
  },
);

export default function MinutesPage() {
  const [uploadedText, setUploadedText] = useState<string>("");
  const [showChat, setShowChat] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);

  // ファイルアップロード後の処理
  const handleFileUpload = (text: string, filename: string) => {
    setUploadedText(text);
    setShowChat(true);
  };

  // 使い方チャットを表示
  const handleShowHelp = () => {
    setShowHelpChat(true);
  };

  // 新規アップロード（リセット）
  const handleReset = () => {
    setUploadedText("");
    setShowChat(false);
    setShowHelpChat(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* メインコンテンツ */}
      {!showChat && !showHelpChat ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* ヘッダー */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-100 mb-4">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">議事録作成</h1>
              <p className="text-gray-500">
                Zoomの文字起こしファイルから、きれいな議事録を自動作成します
              </p>
            </div>

            {/* ファイルアップロードエリア */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                ファイルをアップロード
              </h2>
              <FileUpload
                onUpload={handleFileUpload}
                accept={{
                  "text/plain": [".txt"],
                  "text/vtt": [".vtt"],
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
                    ".docx",
                  ],
                }}
                maxSize={10 * 1024 * 1024} // 10MB
                enableGoogleDrive={true}
              />
            </div>

            {/* 対応形式の説明 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-8">
              <h3 className="text-sm font-medium text-gray-900 mb-2">対応しているファイル形式</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>.vtt</strong> - Zoomのクラウド録画文字起こし
                </li>
                <li>
                  • <strong>.txt</strong> - Zoomのフルトランスクリプト
                </li>
                <li>
                  • <strong>.docx</strong> - Word文書（文字起こしテキスト）
                </li>
              </ul>
            </div>

            {/* 使い方セクション */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">使い方</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">ファイルをアップロード</p>
                    <p className="text-sm text-gray-500">
                      Zoomの文字起こしファイル（.vttまたは.txt）を選択
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AIが議事録を作成</p>
                    <p className="text-sm text-gray-500">自動で決定事項やTODOを抽出・整形</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">内容を確認</p>
                    <p className="text-sm text-gray-500">必要に応じて追加指示や修正を依頼</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">コピーして使用</p>
                    <p className="text-sm text-gray-500">
                      完成した議事録をコピーして文書として保存
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : showHelpChat ? (
        /* 使い方チャット */
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <h2 className="font-semibold text-gray-900">使い方ガイド</h2>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              戻る
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <FeatureChat
              featureId="minutes-help"
              title="使い方ガイド"
              systemPrompt={`あなたは議事録作成機能の使い方を説明するガイドです。

## 議事録作成機能の概要
Zoomの文字起こしファイル（VTTまたはTXT）から、きれいな議事録を自動作成します。

## 主な機能
1. ファイルアップロード（ドラッグ＆ドロップ対応）
2. Google Driveからの選択
3. 自動で決定事項・TODOを抽出
4. 整形された議事録を出力

## 対応ファイル形式
- .vtt - Zoomのクラウド録画文字起こし
- .txt - Zoomのフルトランスクリプト
- .docx - Word文書

## Zoom文字起こしの取得方法
1. Zoom会議をクラウド録画する
2. 会議終了後30分程度待つ（文字起こし生成に時間がかかる）
3. Zoom WebポータルからVTTファイルをダウンロード
4. または、会議中に「文字起こしを保存」でTXTファイルを取得

ユーザーの質問に丁寧に答えてください。`}
              placeholder="使い方について質問してください"
              outputFormat="markdown"
            />
          </div>
        </div>
      ) : (
        /* 議事録作成チャット */
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">議事録作成</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                新規アップロード
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <FeatureChat
              featureId="minutes"
              title="議事録作成"
              systemPrompt={`あなたは議事録作成の専門家です。

## 役割
- 文字起こしテキストから構造化された議事録を作成
- 重要なポイントを抽出
- TODO・決定事項を明確に整理

## 出力形式
以下の構成で議事録を作成してください：

### 会議情報
- 日時：（入力から推測、不明な場合は「未記載」）
- 参加者：（入力から抽出）
- 議題：（入力から抽出）

### 議事内容
- 議論されたトピックを時系列で整理
- 重要な発言を箇条書きで記載

### 決定事項
- 会議で決定された事項を明確にリスト化

### TODO
- 担当者（特定できる場合）
- 期限（特定できる場合）
- タスク内容

### 次回予定
- 次回会議の日時・議題（言及されている場合）

## 制約
- 元のテキストの内容を正確に反映
- 推測で補完する場合は「推測」と明記
- 発言者の特定が困難な場合は「発言者A」等で表現`}
              placeholder="議事録の調整が必要な場合は、ここに入力してください"
              inputLabel="追加指示"
              outputFormat="markdown"
              enableProgramSelector={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
