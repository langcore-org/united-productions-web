# YouTube/Instagramリサーチ統合（本格導入）

> **優先度**: ⏸️ 保留（4月以降）  
> **発見日**: 2026-02-26  
> **関連ファイル**: lib/llm/tools/sns-research.ts  
> **ステータス**: PoC検証待ち  

---

## 背景

YouTubeとInstagramのリサーチ統合について、有料ツールを使用すれば技術的には可能。
ただし、費用対効果を検証した上で本格導入を判断する必要がある。

## 前提条件

- [SNS有料ツール統合検証](../../plans/development/sns-paid-tool-verification.md)の結果が「導入推奨」であること
- United Productions様での費用承認

## 検討対象ツール

| ツール | 対応SNS | 料金目安 | 備考 |
|--------|---------|----------|------|
| Brandwatch | YouTube, Instagram | 高額 | エンタープライズ向け |
| Sprout Social | YouTube, Instagram | 中額 | 総合SNS管理 |
| Hootsuite | YouTube, Instagram | 中額 | 総合SNS管理 |
| 各種API直接統合 | YouTube, Instagram | 従量制 | 技術コスト高 |

## 実装内容

### 1. API統合

- YouTube Data API（有料プラン）
- Instagram Graph API

### 2. 検索機能

- キーワード検索
- トレンド分析
- エンゲージメント指標の取得

### 3. UI実装

- 検索オプションの追加
- 結果表示の統一

## 判断基準

| 項目 | 基準 | 備考 |
|------|------|------|
| 月額費用 | 〜5万円/月 | 想定使用量で |
| データ精度 | Xリサーチと同等 | 有用な情報が得られる |
| 実装工数 | 1週間以内 | PoC済みの前提 |

## タスク

- [ ] PoC検証結果の評価
- [ ] 費用対効果の議論
- [ ] United Productions様の承認取得
- [ ] 本格実装
- [ ] 統合テスト

## メモ

- 現時点ではXリサーチを軸に据える
- 費用が高額な場合は見送りもあり得る
- TikTokも同様に検討（別タスク）
