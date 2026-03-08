# Dialog Templates

Phase 4: 段階的削除の詳細対話例

削除実行時に参照する、ユーザーへの具体的な提示文テンプレート。

---

## Step 4.1: ファイル削除前

```
「Step 4.1: ファイル削除

削除対象:
  📁 app/(authenticated)/na-script/page.tsx
     サイズ: XXX bytes
     最終更新: YYYY-MM-DD
     
  📁 app/api/transcripts/route.ts
     サイズ: XXX bytes
     APIエンドポイント: POST /api/transcripts

リスク:
  ⚠️ API削除後、クライアントからの呼び出しがあるとエラー
     該当呼び出し: lib/xxx.ts:123

このファイルを削除しますか？
A) はい、削除する
B) いいえ、このステップをスキップ
C) ファイルの内容を確認してから決定
D) 中止する」
```

---

## Step 4.2: コード修正

```
「Step 4.2: コード参照の修正

修正が必要なファイル:

1. lib/chat/agents.ts
   問題: AgentId型に "na-script" が定義
   行数: 17行目
   修正内容: Union型から "na-script" を削除
   
   修正前:
     export type AgentId =
       | "general"
       | "na-script"
       | "proposal";
   
   修正後:
     export type AgentId =
       | "general"
       | "proposal";

2. lib/chat/agents.ts
   問題: AGENTS配列に定義
   行数: 136-154行目
   修正内容: オブジェクト全体を削除

3. lib/settings/db.ts
   問題: ツール設定に含まれている
   行数: 45行目
   修正内容: 設定オブジェクトから削除

これらの修正を自動適用しますか？
A) はい、すべて自動修正
B) 手動で修正（修正例を表示）
C) 一部のみ修正（選択）
D) スキップ」
```

---

## Step 4.3: DB削除

```
「Step 4.3: DBデータ削除

削除対象DBデータ:
  💾 SystemPrompt
     - key: TRANSCRIPT
     - name: NA原稿作成
     - content: XXX bytes
     - version: 3
     
     ⚠️ 警告: このプロンプトは3回の改善を経ています
     ⚠️ 警告: バージョン履歴も削除されます

  💾 SystemPrompt
     - key: TRANSCRIPT_FORMAT
     
  💾 FeaturePrompt
     - featureId: na-script

  💾 Chat履歴（オプション）
     - na-script機能を使用したチャット: N件
     → これらも削除しますか？

影響:
  • 削除後、DBから完全に消失
  • 復元はバックアップからのみ可能

削除方法:
A) 完全削除（DELETE）
B) 無効化のみ（isActive=false）
C) データは保持（コードのみ削除）
D) スキップ」
```

---

## Step 4.4: 検証

```
「Step 4.4: 削除検証

実行した検証:
  ✅ ファイル削除確認
     - 削除対象N件すべて削除済
     
  ❌ コード参照確認
     - lib/chat/agents.ts: 1件残存
     
  ✅ DBデータ確認
     - SystemPrompt: 0件
     - FeaturePrompt: 0件
     
  ✅ 型チェック
     - エラー: 1件
       lib/chat/agents.ts:17:3
       error: Type '"na-script"' is not assignable to...

問題が検出されました:
  lib/chat/agents.ts の修正が不完全です

対処:
A) 自動修正を適用
B) 手動で修正（詳細表示）
C) このまま続行（エラーを無視）
D) ステップをやり直す」
```

---

## 反復的進行の例

```
ファイル削除 → 検証 → コード修正 → 検証 → DB削除 → 検証 → 完了
     ↑___________|    ↑__________|    ↑_________|
       （問題があれば戻る）
```

各ステップで問題が検出された場合、前のステップに戻って修正を行う。
