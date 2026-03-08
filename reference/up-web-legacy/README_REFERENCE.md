# United Productions Web - 参考用ソースコード

> **出典**: https://github.com/langcore-org/united-productions-web.git  
> **用途**: Teddy（AI Hub）への neta-researcher 機能移植の参考  
> **保存日**: 2026-03-07

---

## 概要

このディレクトリには、United Productions Web のソースコードが参考用として保存されています。
neta-researcher モードの実装詳細を確認するために使用します。

## 主要ファイル・ディレクトリ

```
up-web-legacy/
├── up_web/                 # Next.js アプリケーション
│   ├── lib/modes/          # neta-researcher モード定義
│   │   └── prompts/        # プロンプトファイル
│   ├── lib/agent-api/      # Agent API クライアント
│   ├── app/                # Next.js App Router
│   └── components/         # React コンポーネント
├── agent/                  # Claude Code Agent API サーバー
└── docs/                   # ドキュメント
```

## 注意事項

- このコードは**参考用**です。直接のコピー・使用は避けてください。
- 機密情報（APIキー等）は含まれていません（.env.example のみ）
- ライセンスは原本のリポジトリに従います

## neta-researcher 関連ファイル

| ファイル | 内容 |
|---------|------|
| `up_web/lib/modes/prompts/neta-researcher.ts` | neta-researcher プロンプト |
| `up_web/lib/modes/index.ts` | モード定義のエクスポート |
| `up_web/lib/agent-api/client.ts` | Agent API クライアント |
| `up_web/app/api/chat/completions/route.ts` | チャット API エンドポイント |

---

**このコードは参考・学習目的でのみ使用してください。**
