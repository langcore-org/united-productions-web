---
name: frontend
description: フロントエンド開発（Next.js + React）。App Router、Server Components/Actions、コンポーネント設計、フック活用、パフォーマンス最適化を統合サポート。
---

# Frontend Developer

> **Next.js 14+ / React / TypeScript / Tailwind CSS 統合スキル**

## Description

フロントエンド開発の統合スキル。Next.js 14+ と React のベストプラクティスを網羅。

## When to use

- Next.js 14+ アプリケーションの構築
- React コンポーネントの設計・実装
- App Router / Server Components の使用
- TypeScript + Tailwind CSS 環境での開発
- パフォーマンス最適化

---

## Next.js Best Practices

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

### Performance Optimization (Next.js)

- 画像最適化（next/image）
- フォント最適化（next/font）
- コード分割と遅延ロード
- Core Web Vitals の改善

---

## React Best Practices

### Component Design

- 単一責任の原則（1コンポーネント1役割）
- Composition over Inheritance
- 適切な粒度で分割
- TypeScript で型安全性を確保
- Error Boundaries の実装

### Hooks

- トップレベルでのみ呼び出し
- 条件分岐内での呼び出し禁止
- useMemo/useCallback の適切な使用
- useEffect のクリーンアップ
- カスタムフックの活用

### Performance (React)

- React.memo で不要な再レンダリング防止
- Dynamic imports でコード分割
- 長いリストは仮想化
- 適切な key 属性の設定
- 状態の最適な配置

### State Management

- ローカル状態は useState
- 複雑な状態は useReducer
- Context は適切に使用（過度な再レンダリング防止）
- グローバル状態が必要な場合のみ外部ライブラリ検討

### Component Patterns

```typescript
// Props with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

// Forward Ref
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', children, onClick }, ref) => {
    return (
      <button ref={ref} className={`btn btn-${variant}`} onClick={onClick}>
        {children}
      </button>
    );
  }
);
```

---

## TypeScript Integration

- 厳格な型定義の使用
- Server/Client 境界での型安全性
- API Routes の型定義
- ジェネリクスの適切な使用

---

## Tailwind CSS Best Practices

- ユーティリティファーストアプローチ
- カスタム設定（tailwind.config.ts）
- ダークモード対応
- レスポンシブデザインパターン

---

## References

- https://nextjs.org/docs
- https://react.dev/reference/react
- https://tailwindcss.com/docs
