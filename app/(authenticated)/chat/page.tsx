"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, 
  Clock, 
  Edit3, 
  Trash2, 
  Move,
  Search,
  Lightbulb,
  MoreHorizontal,
  Sparkles,
  ChevronRight
} from "lucide-react";

interface HistoryItem {
  id: string;
  title: string;
  timestamp: Date;
}

interface HistoryGroup {
  label: string;
  items: HistoryItem[];
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  thinkingTime?: number;
}

// 相対時間を計算する関数
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "刚刚";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`;
  return date.toLocaleDateString("ja-JP");
}

// モック履歴データ
const mockHistoryGroups: HistoryGroup[] = [
  {
    label: "今日",
    items: [
      { id: "1", title: "Reactのベストプラクティスについて教えて", timestamp: new Date(Date.now() - 1000 * 60 * 30) },
      { id: "2", title: "TypeScriptの型システムの解説", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
      { id: "3", title: "Next.js 14の新機能まとめ", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
    ],
  },
  {
    label: "昨日",
    items: [
      { id: "4", title: "Tailwind CSSのカスタマイズ方法", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26) },
      { id: "5", title: "Prismaでのスキーマ設計", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28) },
    ],
  },
  {
    label: "過去7日間",
    items: [
      { id: "6", title: "AIアプリケーションのアーキテクチャ", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48) },
      { id: "7", title: "OpenAI APIの使い方", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72) },
      { id: "8", title: "Vercelへのデプロイ方法", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120) },
    ],
  },
];

// モックチャットデータ
const mockChatData: Record<string, { query: string; thinkingTime: number; messages: ChatMessage[] }> = {
  "1": {
    query: "Reactのベストプラクティスについて教えて",
    thinkingTime: 3,
    messages: [
      {
        id: "m1",
        type: "user",
        content: "Reactのベストプラクティスについて教えて",
      },
      {
        id: "m2",
        type: "assistant",
        content: `## Reactのベストプラクティス

### 1. コンポーネントの設計

**単一責任の原則**
- 各コンポーネントは一つのことだけを担当する
- 複雑なコンポーネントは小さなサブコンポーネントに分割する

**コンポジションの活用**
\`\`\`tsx
// ❌ 避けるべき
function Button(props) {
  return <button className="btn" {...props} />;
}

// ✅ 推奨
function Button({ children, variant = "primary", ...props }) {
  return (
    <button className={\`btn btn-\${variant}\`} {...props}>
      {children}
    </button>
  );
}
\`\`\`

### 2. ステート管理

**ローカルステートを優先**
- まずローカルステート（\`useState\`）を検討する
- 本当に必要な場合のみグローバルステートを使用

**状態の最適化**
\`\`\`tsx
// ❌ 不必要な再レンダリング
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <HeavyComponent /> {/* 毎回再レンダリングされる */}
    </div>
  );
}

// ✅ React.memoで最適化
const HeavyComponent = React.memo(function HeavyComponent() {
  // ...
});
\`\`\`

### 3. パフォーマンス最適化

- \`React.memo\` で不要な再レンダリングを防止
- \`useMemo\` と \`useCallback\` を適切に使用
- リストには必ず \`key\` プロパティを指定

### 4. 型安全性

TypeScriptを使用して型安全性を確保：

\`\`\`tsx
interface UserProps {
  id: string;
  name: string;
  email?: string;
}

function UserCard({ id, name, email }: UserProps) {
  return (
    <div className="user-card">
      <h3>{name}</h3>
      {email && <p>{email}</p>}
    </div>
  );
}
\`\`\``,
        thinkingTime: 3,
      },
    ],
  },
  "2": {
    query: "TypeScriptの型システムの解説",
    thinkingTime: 5,
    messages: [
      {
        id: "m3",
        type: "user",
        content: "TypeScriptの型システムの解説",
      },
      {
        id: "m4",
        type: "assistant",
        content: `## TypeScriptの型システム

TypeScriptはJavaScriptに静的型付けを追加した言語です。

### 基本の型

| 型 | 説明 | 例 |
|---|---|---|
| \`string\` | 文字列 | \`"hello"\` |
| \`number\` | 数値 | \`42\` |
| \`boolean\` | 真偽値 | \`true\` |
| \`array\` | 配列 | \`number[]\` |
| \`object\` | オブジェクト | \`{ name: string }\` |

### 高度な型機能

**ジェネリクス**
\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}

const num = identity<number>(42);
const str = identity<string>("hello");
\`\`\`

**条件型**
\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;      // false
\`\`\`

### 型推論

TypeScriptは賢い型推論を行います：

\`\`\`typescript
// 明示的な型注釈は不要
const numbers = [1, 2, 3]; // number[] と推論される

// 関数の戻り値も推論される
function add(a: number, b: number) {
  return a + b; // number と推論される
}
\`\`\``,
        thinkingTime: 5,
      },
    ],
  },
  "3": {
    query: "Next.js 14の新機能まとめ",
    thinkingTime: 4,
    messages: [
      {
        id: "m5",
        type: "user",
        content: "Next.js 14の新機能まとめ",
      },
      {
        id: "m6",
        type: "assistant",
        content: `## Next.js 14の主な新機能

### Server Actions（安定版）

フォーム送信やデータ変更を簡潔に記述：

\`\`\`tsx
// app/page.tsx
export default function Page() {
  async function createInvoice(formData: FormData) {
    'use server';
    const rawFormData = {
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
    };
    // データベースへの保存など
  }

  return <form action={createInvoice}>...</form>;
}
\`\`\`

### Partial Prerendering (プレビュー)

静的部分と動的部分を組み合わせ：

\`\`\`tsx
export default function Page() {
  return (
    <>
      <Header /> {/* 静的 */}
      <Suspense fallback={<Skeleton />}>
        <DynamicContent /> {/* 動的 */}
      </Suspense>
    </>
  );
}
\`\`\`

### Turbopack（改善）

- ローカルサーバー起動が53%高速化
- コード更新反映が94%高速化

### その他の改善点

- **Metadata API**: 統合メタデータ管理
- **Image Optimization**: より柔軟な画像設定
- **Logging**: 改良されたエラーログ`,
        thinkingTime: 4,
      },
    ],
  },
};

// デフォルトのチャットデータ
const defaultChatData = {
  query: "Reactのベストプラクティスについて教えて",
  thinkingTime: 3,
  messages: mockChatData["1"].messages,
};

// マークダウン風のテキストをレンダリングするコンポーネント
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // コードブロック
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre
          key={key++}
          className="my-4 p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm font-mono text-gray-800 border border-gray-200"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // 見出し
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-gray-900 mt-8 mb-4">
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // 太字
    if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={key++} className="my-2 text-gray-700">
          <strong>{line.slice(2, -2)}</strong>
        </p>
      );
      continue;
    }

    // テーブル
    if (line.startsWith("|")) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      i--;

      // ヘッダー行と区切り行をスキップ
      const dataRows = tableLines.filter((l) => !l.includes("---"));
      
      elements.push(
        <table key={key++} className="my-4 w-full border-collapse">
          <tbody>
            {dataRows.map((row, rowIdx) => {
              const cells = row.split("|").filter(Boolean).map((c) => c.trim());
              return (
                <tr
                  key={rowIdx}
                  className={cn(
                    "border-b border-gray-200",
                    rowIdx === 0 ? "bg-gray-50 font-semibold" : ""
                  )}
                >
                  {cells.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-2 text-sm text-gray-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
      continue;
    }

    // リストアイテム
    if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} className="ml-5 my-1 text-gray-700 list-disc">
          {line.slice(2)}
        </li>
      );
      continue;
    }

    // 空行
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // 通常のテキスト（インラインコードを処理）
    const processedLine = line.split(/(`[^`]+`)/).map((part, idx) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-orange-600"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={idx}>{part}</span>;
    });

    elements.push(
      <p key={key++} className="my-2 text-gray-700 leading-relaxed">
        {processedLine}
      </p>
    );
  }

  return <div className="prose prose-gray max-w-none">{elements}</div>;
}

export default function ChatPage() {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("1");
  const [hoveredHistoryId, setHoveredHistoryId] = useState<string | null>(null);

  const currentChat = mockChatData[selectedHistoryId] || defaultChatData;

  return (
    <div className="flex h-screen bg-white">
      {/* 左側 - 履歴パネル */}
      <aside className="w-[300px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">履歴</h2>
            <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              <Search className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 履歴リスト */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {mockHistoryGroups.map((group) => (
            <div key={group.label} className="py-2">
              {/* グループラベル */}
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>

              {/* アイテムリスト */}
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group relative px-4 py-3 mx-2 rounded-lg cursor-pointer transition-all duration-200",
                    selectedHistoryId === item.id
                      ? "bg-orange-50 border border-orange-100"
                      : "hover:bg-gray-50 border border-transparent"
                  )}
                  onClick={() => setSelectedHistoryId(item.id)}
                  onMouseEnter={() => setHoveredHistoryId(item.id)}
                  onMouseLeave={() => setHoveredHistoryId(null)}
                >
                  <div className="flex items-start gap-3">
                    {/* アイコン */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedHistoryId === item.id
                          ? "bg-orange-100"
                          : "bg-gray-100 group-hover:bg-gray-200"
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "w-4 h-4",
                          selectedHistoryId === item.id
                            ? "text-orange-600"
                            : "text-gray-500"
                        )}
                      />
                    </div>

                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          selectedHistoryId === item.id
                            ? "text-orange-900"
                            : "text-gray-700"
                        )}
                      >
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {getRelativeTime(item.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* ホバー時のアクションボタン */}
                    <div
                      className={cn(
                        "flex items-center gap-1 transition-opacity duration-200",
                        hoveredHistoryId === item.id ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <button
                        className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 編集処理
                        }}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 削除処理
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            新しいチャット
          </button>
        </div>
      </aside>

      {/* 右側 - チャットエリア */}
      <main className="flex-1 flex flex-col bg-white min-w-0">
        {/* ヘッダー */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {currentChat.query}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{currentChat.thinkingTime}秒 考えました</span>
              </div>
            </div>
          </div>

          {/* ヘッダーアクション */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </header>

        {/* チャットコンテンツ */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {currentChat.messages.map((message) => (
              <div key={message.id} className="mb-8">
                {message.type === "user" ? (
                  // ユーザーメッセージ
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">U</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  // アシスタントメッセージ
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 思考時間バッジ */}
                      {message.thinkingTime && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full mb-4">
                          <Lightbulb className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-xs font-medium text-orange-600">
                            {message.thinkingTime}秒 考えました
                          </span>
                        </div>
                      )}

                      {/* コンテンツ */}
                      <div className="prose prose-gray max-w-none">
                        <MarkdownContent content={message.content} />
                      </div>

                      {/* アクションボタン */}
                      <div className="flex items-center gap-2 mt-6">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                          <Move className="w-4 h-4" />
                          移動
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                          <Edit3 className="w-4 h-4" />
                          編集
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 入力エリア（オプション） */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="text"
                placeholder="メッセージを入力..."
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
              />
              <button className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              AIは正確な情報を提供するよう努めていますが、内容を確認するようにしてください。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
