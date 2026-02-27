# CSS Parse エラー（Biome制限）

> **発見日**: 2026-02-26
> **優先度**: ⚪ 情報（対応不要）
> **関連**: Biome, CSS

---

## 概要

BiomeがCSSファイルのパース時にエラーを報告していますが、これはBiomeのCSSパーサーの制限によるものです。ビルドや機能には影響しません。

---

## エラー内容

```
app/globals.css:4:2 parse
app/globals.css:101:6 parse
app/globals.css:104:6 parse
```

## 原因

BiomeのCSSパーサーが以下の構文をサポートしていない:

1. Tailwind CSSの`@layer`ディレクティブ
2. CSS変数の複雑な計算
3. `@apply`ディレクティブ

## 対応方針

**現状維持で問題なし**

- Next.jsのビルドは正常に完了する
- Tailwind CSSは正しく動作する
- ブラウザでの表示に問題はない

## 将来的な対応（オプション）

BiomeがCSSを完全にサポートするのを待つか、`biome.json`でCSSファイルを無視する設定を追加:

```json
{
  "files": {
    "ignore": ["**/*.css"]
  }
}
```

**ただし、現在は設定不要**（エラーは出るがビルドは成功する）

---

## 参考

- [Biome CSS Support](https://biomejs.dev/internals/language-support/)
