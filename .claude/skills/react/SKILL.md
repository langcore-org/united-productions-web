# React Developer

> **React 開発統合スキル - コンポーネント設計 + ベストプラクティス**

## Description

React アプリケーション開発の統合スキル。コンポーネント設計、フックの活用、パフォーマンス最適化を網羅。

## When to use

- React コンポーネントの設計・実装
- フックの効果的な使用
- パフォーマンス最適化
- 状態管理の実装

## Best Practices

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

### Performance

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

## References

- https://react.dev/reference/react
- https://vercel.com/blog/introducing-react-best-practices
