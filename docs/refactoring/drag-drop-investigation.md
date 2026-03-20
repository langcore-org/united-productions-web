# ドラッグ＆ドロップ機能 実装再調査レポート

**初回調査日**: 2026-03-18  
**再調査日**: 2026-03-20  
**調査対象**: チャット添付・文字起こしアップロード・関連ドラッグ＆ドロップ実装  
**調査者**: AI Assistant

---

## 1. 概要

既存レポートは「チャット画面のドラッグ＆ドロップ重複整理」という観点では有効だったが、今回の再調査で以下の不足が見つかった。

- 実際には `FeatureChat` だけでなく、`FileAttachButton` のクリック添付経路も含めて監査しないと仕様差分を見落とす
- `FileUpload` 系は別経路のため、単純な共通化ではなく「何を共有し、何を分離すべきか」の整理が必要
- `FileAttachment` と `FileUploadChat` に未使用または未接続のコードがあり、現状把握を曖昧にしている
- テストが存在しないため、リファクタリング計画に「先に最小テストを置く」視点が必要

本レポートは、現行実装の実態を改めて整理し、問題点と改善方針をより現実的な形に更新したもの。

### 1.1 今回の調査範囲

- チャット画面でのファイルドロップ
- チャット画面でのクリック添付
- 議事録・文字起こし用の単体アップロード
- サーバー側のファイル解析経路
- アクセシビリティ、テスト、依存ライブラリ採用是非

### 1.2 検証方法

- 実コード読解
- 関連ドキュメント読解
- 既存バックログ/lesson の参照
- MDN のファイルドロップ実装ガイド確認
- 外部ベストプラクティスの確認

---

## 2. 現在の実装構造

### 2.1 実質的に動いている経路

| 経路 | 主なファイル | 役割 |
|------|--------------|------|
| チャット: ドロップ | `components/ui/FeatureChat.tsx` | セクション全体の drag events、添付状態更新、エラー表示 |
| チャット: クリック添付 | `components/ui/ChatInputArea.tsx`, `components/ui/FileAttachment.tsx` | `FileAttachButton` から hidden input を開く |
| チャット: 表示/LLM送信用整形 | `lib/chat/file-content.ts` | `AttachedFile` 相当の内容を表示用/LLM用文字列へ変換 |
| 議事録アップロード | `components/ui/FileUpload.tsx` | 単一ファイルの drag/drop + click + Drive |
| アップロード通信 | `hooks/useFileUpload.ts` | `/api/upload` への送信 |
| サーバー解析 | `app/api/upload/route.ts`, `lib/upload/file-parser.ts` | ファイルサイズ検証、テキスト抽出 |

### 2.2 現在の実態とズレがあるファイル

| ファイル | 現状 |
|---------|------|
| `components/ui/FileAttachment.tsx` | `AttachedFile` 型と `FileAttachButton` は使われているが、`FileAttachment` コンポーネント本体は未使用 |
| `components/meeting-notes/FileUploadChat.tsx` | 画面上の文言は「ドラッグ＆ドロップ」だが、実装上は drag/drop ハンドラがなく、さらに利用箇所も見つからない |

### 2.3 アーキテクチャ上の重要な境界

現状は「ファイル関連機能」が1つではなく、少なくとも以下の2系統に分かれている。

1. **チャット添付経路**
   - クライアント側で `FileReader` を使う
   - テキスト/画像は内容をそのまま保持する
   - バイナリはメタ情報のみ保持する
   - 最終的に `buildDisplayContent()` / `buildLlmContent()` へ流れる

2. **アップロード解析経路**
   - `FormData` で `/api/upload` へ送る
   - サーバー側で `.txt`, `.vtt`, `.docx` を解析する
   - Google Drive 選択もこの文脈に属する

この2系統は**完全統合の対象ではない**。共通化すべきなのは「サイズ表記」「上限値」「許可ポリシー」「ドロップUIルール」のような共有ポリシーであり、`FileReader` と `parseFile()` まで無理に1つへ寄せるべきではない。

---

## 3. 主要な発見

### 3.1 高優先度の問題

| 重要度 | 項目 | 内容 | 影響 |
|-------|------|------|------|
| 🔴 高 | クリック添付とドロップ添付でバリデーションが不一致 | `FeatureChat` のドロップ経路はサイズ上限・最大5件を検証するが、`FileAttachButton` は件数制限もサイズ検証も持たない | ユーザー操作によって結果が変わる |
| 🔴 高 | 許可ファイル形式が経路ごとに不一致 | ドロップはほぼ無制限、クリック添付は拡張子制限あり、`FileUpload` は `.txt/.vtt/.docx` のみ | UXと保守性が不安定 |
| 🔴 高 | 共通化計画が client/server の境界を曖昧にしている | 旧プランの `lib/file-utils.ts` には `FileReader` 系まで含まれており、サーバー解析責務と混ざる | 将来の責務肥大化を招く |

### 3.2 中優先度の問題

| 重要度 | 項目 | 内容 | 影響 |
|-------|------|------|------|
| 🟡 中 | 未使用/未接続コードが計画判断を曇らせる | `FileAttachment` 本体と `FileUploadChat` が現状仕様のノイズになっている | 不要なリファクタ対象が混入する |
| 🟡 中 | サイズ定数とフォーマッタが分散 | `config/constants.ts`, `types/upload.ts`, `lib/upload/file-parser.ts`, `FileUpload.tsx`, `FeatureChat.tsx` などで重複 | 仕様変更時の漏れリスク |
| 🟡 中 | `AttachedFile` 型が UI コンポーネント内にある | `FeatureChat` / `ChatInputArea` が `FileAttachment.tsx` の型に依存 | 責務境界が逆転している |
| 🟡 中 | ドラッグ UX/a11y が未整備 | ファイル以外の drag でも反応し得る、`dropEffect` 未設定、ライブリージョンなし、global drop の考慮なし | 誤反応・操作感低下 |
| 🟡 中 | テスト不在 | 関連ユニット/E2E テストが見当たらない | 回帰検知が難しい |

### 3.3 低優先度の問題

| 重要度 | 項目 | 内容 |
|-------|------|------|
| 🟢 低 | `formatFileSize` / `formatBytes` の重複 | 表示仕様が分散している |
| 🟢 低 | `as string` キャスト | FileReader 境界の型付け改善余地あり |

---

## 4. 詳細調査

### 4.1 `FeatureChat.tsx`

現在のチャットドラッグ＆ドロップは `FeatureChat` に集約されている。

実装済み:

- `dragCounter` によるネスト対策
- オーバーレイ表示
- サイズ検証
- 最大5ファイル制限
- ストリーミング中の無効化

不足:

- `dataTransfer.items` を見て「ファイルドラッグ時のみ反応する」判定がない
- `dropEffect` の制御がない
- クリック添付経路と処理が共有されていない
- `processFile()` と `validateFile()` がこのファイルに居座っている

### 4.2 `FileAttachButton` / `ChatInputArea`

ここが旧レポートで浅かった最大のポイント。

`FileAttachButton` は hidden file input からファイルを読み込むが、以下の問題がある。

- 最大件数チェックなし
- サイズ検証なし
- エラーUIなし
- `processFile()` 相当のロジックを独自実装
- 受け入れ拡張子がドロップ経路と一致していない

つまり現在のチャット添付仕様は、**見た目上は1機能だが内部的には2系統**である。

### 4.3 `FileAttachment.tsx`

このファイルには以下が混在している。

- `AttachedFile` 型
- 未使用の `FileAttachment` 表示コンポーネント
- 実際に使われている `FileAttachButton`

問題:

- 型の置き場としては便利だが責務が不自然
- `_handleDragOver` は未接続
- `FileAttachment` 本体をリファクタ対象に含め続けると、実際の改善優先度を誤る

### 4.4 `FileUpload.tsx` とサーバー解析経路

`FileUpload.tsx` は drag/drop を持つが、チャット添付とは役割が異なる。

- 単一ファイルのみ
- `.txt`, `.vtt`, `.docx` に限定
- `/api/upload` 経由でサーバー解析
- Google Drive 選択に対応

このため、チャット用フックと完全統合するよりも、以下だけ共有するのが妥当。

- サイズ上限の単一ソース化
- サイズ文字列フォーマット
- ドロップ状態の振る舞いルール

### 4.5 `FileUploadChat.tsx`

再調査の結果:

- このコンポーネントを import している箇所は見つからなかった
- UI文言に「ドラッグ＆ドロップ」とあるが、実装上の drag/drop ハンドラはない

したがって、現時点では「現行仕様の一部」ではなく、**整理対象の孤立コンポーネント**として扱うのが正確。

---

## 5. 重複と不整合の棚卸し

### 5.1 重複している主なロジック

| 種別 | 重複箇所 | コメント |
|------|---------|----------|
| ファイル読み込み | `FeatureChat.tsx`, `FileAttachment.tsx`, `FileAttachButton` | `FileReader` 処理が複製されている |
| サイズ検証 | `FeatureChat.tsx`, `FileAttachment.tsx`, `FileUpload.tsx`, `app/api/upload/route.ts`, `lib/upload/file-parser.ts`, `types/upload.ts` | 単位と定数の置き場が分散 |
| サイズ表記 | `FileAttachment.tsx`, `FileUpload.tsx`, `app/api/upload/route.ts`, `lib/upload/file-parser.ts`, `lib/chat/file-content.ts` | UI文言揺れの温床 |
| 受け入れ形式定義 | `FileAttachButton`, `FileAttachment.tsx`, `FileUpload.tsx`, `types/upload.ts` | ユースケースごとにルールが分裂 |
| drag event の骨格 | `FeatureChat.tsx`, `FileUpload.tsx`, `FileAttachment.tsx` | ただし `FileAttachment.tsx` はデッドパス寄り |

### 5.2 実装上の不整合

| 項目 | ドロップ | クリック添付 | 議事録アップロード |
|------|----------|--------------|--------------------|
| 最大件数 | 5 | なし | 1 |
| サイズ検証 | あり | なし | あり |
| エラー表示 | あり | なし | あり |
| 許可形式 | 事実上広い | 明示的な拡張子のみ | `.txt/.vtt/.docx` |
| 内容取得 | `FileReader` | `FileReader` | サーバー解析 |

この表が示す通り、問題の本質は「コード重複」だけでなく**ポリシーの一貫性欠如**にある。

---

## 6. 外部ベストプラクティスとの比較

### 6.1 MDN から取り込むべき点

MDN の file drag and drop ガイドでは、以下が重要とされる。

- file input をフォールバックとして必ず持つ
- `dragover` / `drop` の `preventDefault()` を適切に行う
- `dataTransfer.items` を見てファイルドラッグか判定する
- 不正な対象には `dropEffect = "none"` を返す
- OS からブラウザへのドロップでは `dragenter` / `dragleave` が重要

現在の実装はフォールバック input は持つが、`dataTransfer.items` / `dropEffect` / global drop 制御の観点が弱い。

### 6.2 `react-dropzone` 採用是非

結論:

- **現時点では導入不要**
- 現要件は自前実装で十分
- ただし以下が必要になったら再検討価値がある

再検討トリガー:

- 複数のドロップゾーンを統一的に扱いたい
- `fileRejections` を共通UIで扱いたい
- a11y とフォーカス制御をライブラリに寄せたい
- ブラウザ差異吸収コストが高くなった

---

## 7. 改善されたリファクタリング方針

### 7.1 原則

1. **まずユーザー体験の不一致を解消する**
2. **共通化は「共有ポリシー」と「共有UI」までに留める**
3. **client/server のファイル処理は無理に統合しない**
4. **未使用コードは先に扱いを決める**
5. **テストを先に最小限置く**

### 7.2 改善後の設計方針

#### A. チャット添付ロジックの一本化

- ドロップとクリック添付が同じ検証・同じ処理を通るようにする
- `FeatureChat` 側で「添付ポリシー」と「処理結果」を一元管理する
- `ChatInputArea` は UI に寄せ、添付処理ロジックを持たない

#### B. 型とポリシーの分離

- `AttachedFile` 型を UI コンポーネント外へ移動
- チャット添付用の許可形式、最大件数、サイズ制限を単一ソース化

#### C. ドラッグ状態管理の軽量共通化

- `useDragAndDrop` は「ドラッグ状態管理」に限定する
- `useFileProcessor` は「チャット添付処理」に限定する
- `FileUpload` のサーバー解析まで同じ抽象に乗せない

#### D. アクセシビリティ改善

- ファイルドラッグ時のみオーバーレイ表示
- クリック添付の案内文とドロップ案内文を同期
- エラーと状態通知の live region を検討

---

## 8. 改訂版 優先順位

| 順位 | タスク | 狙い | 工数目安 |
|-----|--------|------|---------|
| 1 | クリック添付とドロップ添付の共通バリデーション化 | 仕様不一致の解消 | 2-3h |
| 2 | `AttachedFile` 型とチャット添付ポリシーの分離 | 依存整理 | 1h |
| 3 | `FeatureChat` からファイル処理抽出 | 可読性と再利用性の向上 | 2h |
| 4 | `FileUpload` と共有可能な定数/formatter だけ統一 | client/server 境界維持 | 1-2h |
| 5 | 未使用コンポーネントの扱い確定 | スコープ明確化 | 0.5h |
| 6 | 最小ユニットテスト追加 | 回帰防止 | 2h |
| 7 | drag UX / a11y 改善 | 品質向上 | 1-2h |

---

## 9. リスクと対策

| リスク | 重大度 | 対策 |
|--------|--------|------|
| チャット添付仕様の変更で既存操作感が変わる | 高 | クリック/ドロップ両経路を同時に比較確認する |
| 共通化しすぎて client/server 境界が崩れる | 高 | 共有対象を「定数・型・表示関数」に限定する |
| テスト不在で退行を見逃す | 高 | 先にバリデーションと serialization の単体テストを置く |
| 未使用コード整理で将来利用案を失う | 中 | 削除前に「完全削除 / legacy 保持」を決める |

---

## 10. 結論

今回の再調査で、問題の本質は「ドラッグ＆ドロップの重複」だけではなく、**チャット添付機能そのものが操作経路ごとに別実装になっていること**だと判明した。特に `FileAttachButton` 経路が最大件数・サイズ検証・エラー表示を持たない点は、最優先で揃えるべき。

また、旧プランは共通化の方向性自体は正しいが、client/server の境界をまたぐ統合案が混ざっていた。今後は以下の順で進めるのが妥当。

1. チャット添付の仕様一本化
2. 型・ポリシーの分離
3. 軽量フック化
4. 共有できる定数/表示処理のみ統一
5. テスト追加と a11y 改善

---

## 付録: 参考資料

- [MDN: File drag and drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop)
- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/ja/docs/Web/API/HTML_Drag_and_Drop_API)
