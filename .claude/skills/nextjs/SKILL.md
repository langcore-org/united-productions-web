---
name: nextjs
description: Next.js 14+アプリケーション開発。App Router、Server Components/Actions、TypeScript、Tailwind CSS、パフォーマンス最適化を統合サポート。
---

# Next.js Developer

> **Next.js 14+ / App Router / TypeScript / Tailwind CSS 統合スキル**

## Description

Next.js 14+ アプリケーション開発の統合スキル。App Router、Server Components/Actions、最適化パターンを網羅。

## When to use

- Next.js 14+ アプリケーションの構築
- App Router の使用
- Server Components/Actions の実装
- SSR/SSG/Streaming の設定
- TypeScript + Tailwind CSS 環境での開発
- パフォーマンス最適化

## Best Practices

### App Router Fundamentals

- Server Components をデフォルトとして使用
- "use client" は必要な場合のみ使用
- Loading および Error boundaries の実装
- Route groups での構成管理

### Data Fetching

- 可能な限りサーバー側でフェッチ
- 適切なキャッシュ戦略の使用
- ストリーミングの実装
- Loading 状態の適切な処理

### Server Actions

- セキュアなミューテーション
- 変更後の revalidate
- フォーム送信の処理
- エラーハンドリング

### TypeScript Integration

- 厳格な型定義の使用
- Server/Client 境界での型安全性
- API Routes の型定義
- ジェネリクスの適切な使用

### Tailwind CSS Best Practices

- ユーティリティファーストアプローチ
- カスタム設定（tailwind.config.ts）
- ダークモード対応
- レスポンシブデザインパターン

### Performance Optimization

- 画像最適化（next/image）
- フォント最適化（next/font）
- コード分割と遅延ロード
- Core Web Vitals の改善

## References

- https://nextjs.org/docs
- https://tailwindcss.com/docs
