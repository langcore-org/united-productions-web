# Performance Optimization Plan

## 問題概要
Wrapperを介した場合、Claude Code直接実行と比較して約10倍の遅延が発生している。

## 根本原因分析

### 1. claude_cli.py のdir()ループ (影響度: 25%)
**場所**: `claude_cli.py:180-215`

```python
# 現在の問題コード - 毎メッセージでdir()を呼び出し
for attr_name in dir(message):
    if not attr_name.startswith("_"):
        attr_value = getattr(message, attr_name)
```

**問題点**:
- `dir()`は全ての属性とメソッドを列挙するため非常に遅い
- 毎メッセージで数百回のgetattr呼び出し
- callableチェックも追加のオーバーヘッド

**解決策**:
- 既知の属性のみ直接アクセス (`content`, `type`, `model`, `stop_reason`等)
- SDK型の直接変換メソッドを使用

### 2. main.py のツール検出ロジック重複 (影響度: 40%)
**場所**: `main.py:449-715`

**問題点**:
- 同じツール検出ロジックが3箇所で繰り返し
  - 行470-537: chunk_content処理
  - 行540-605: old format処理
  - 行646-683: content block処理
- 各チャンクで複数回のhasattr/isinstance/getattr呼び出し

**解決策**:
- 統一されたツール検出関数を作成
- 一度だけ処理して結果をキャッシュ

### 3. 過剰なログ出力 (影響度: 20%)
**場所**: `claude_cli.py:170-210`, `main.py:437-448`

**問題点**:
- INFO レベルで毎メッセージをログ出力
- JSON シリアライズを毎回実行
- str()変換のオーバーヘッド

**解決策**:
- INFO → DEBUG に変更
- 条件付きログ (isEnabledFor チェック)

### 4. 3重ストリーム変換 (影響度: 15%)
**フロー**:
```
SDK AsyncGenerator → Python yield → FastAPI SSE → Next.js TransformStream → Client
```

**問題点**:
- 各段階でエンコード/デコード
- バッファリングの非効率

**解決策**:
- 変換段階の最小化
- 直接パススルーの検討

## 実装計画

### Phase 1: claude_cli.py 最適化 (即効性: 高)

1. **dir()ループの削除**
   - 既知の属性リストを定義
   - 直接アクセスに変更

2. **ログレベル最適化**
   - INFO → DEBUG に変更
   - isEnabledFor チェック追加

### Phase 2: main.py ツール検出統合 (効果: 最大)

1. **統一ツール検出関数の作成**
```python
def extract_tool_info(block) -> Optional[Tuple[str, dict]]:
    """Extract tool name and input from any block format."""
    # 一箇所で全フォーマットを処理
```

2. **重複ロジックの削除**
   - 3箇所の処理を1回の呼び出しに統合

### Phase 3: ストリーム最適化

1. **バッファリング戦略の見直し**
2. **不要な変換の削除**

## 期待される改善

| Phase | 対象 | 期待改善率 |
|-------|------|-----------|
| Phase 1 | claude_cli.py | 25-30% |
| Phase 2 | main.py | 35-40% |
| Phase 3 | streaming | 10-15% |
| **合計** | | **60-70%** |

## 実装順序

1. ✅ 計画ドキュメント作成
2. [ ] Phase 1: claude_cli.py 修正
3. [ ] Phase 2: main.py 修正
4. [ ] Phase 3: ストリーム最適化
5. [ ] テスト・検証

## 測定方法

修正前後で以下を計測:
- 初回レスポンスまでの時間 (TTFB)
- 完全なレスポンス完了時間
- チャンク間の遅延

## リスク

- SDK型の変更による互換性問題
- ログ削減によるデバッグ困難化
- 予期せぬエッジケースの発生

## ロールバック計画

各Phase毎にコミットし、問題発生時は個別にrevert可能にする。
