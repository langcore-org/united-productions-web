# Teddy ユーザー向けページ リデザイン — ミニマル & エレガント

> **作成方法**: このドキュメントは `/frontend-design` スキルを使って設計されました。
> **設計レベル**: エージェンティック調査による詳細プラン

## Context

ユーザー向け4ページ（トップ、サインイン、チャット、チャット履歴）を「**ミニマル & エレガント**」方向にリデザインします。

現状はすでにモノクロ・ミニマルなデザイン基盤があるため、構造を変えずに **フォント・色彩・細部（シャドウ・間隔・タイポグラフィ）を磨く** ことで品質を上げるアプローチです。差分を最小限に保つのが重要な要件です。

### リデザインの目的
- 現在の「シンプルだがやや無機質」な印象から、「洗練された・意図的に設計された感覚」への進化
- ブランド感の醸成（Teddyというパーソナリティを見た目でも表現）
- 既存コード・構造への影響を最小化（マージコストの低减）

## デザイン方針

| 項目 | 方向性 |
|------|--------|
| **フォント** | 見出し用に Instrument Serif（英字）を限定追加 / 本文を Noto Sans JP に置換 |
| **カラー** | 既存のgrok-*変数を微調整（黒→やや柔らかく、グレースケール統一） |
| **シャドウ・深さ** | グラデーション廃止 → 微妙な影で階層表現 |
| **アニメーション** | CSS transition のみ（framer-motion不使用） |
| **ダークモード** | 対象外（ライトモード固定設計） |

## 実装ファイル一覧（優先度順）

### Priority 1 — `app/globals.css` — デザイントークン統一
**ファイルパス**: `/home/koyomaru/teddy/app/globals.css`

**目的**:
- CSS変数の統一化により、全ページ・全コンポーネントに一貫したデザイン言語を実装
- フォント設定を `app/layout.tsx` と連携
- 色彩の微調整で、圧迫感を軽減し「洗練された」印象を演出

**期待効果**:
- 後続の全ページ変更が効率化（変数を参照するだけで済む）
- カラースキーム全体が統一される（修正時の波及効果）
- トランジション時間の短縮で、UIのレスポンス感が向上

**ビジュアル変化**:
- **ボーダー色**: `#e5e5e5` → `#ebebeb`（わずかに明るく、圧迫感が軽減される）
- **テキストセカンダリ**: グレースケール内で色調が統一（やや暖かみが出る）
- **フォント**: 見出しに Instrument Serif（セリフ体）が使用可能に（ロゴが格式高く見える）
- **トランジション**: ボタンやホバー状態の反応が `0.2s → 0.15s` に高速化（UIが小気味良くなる）

**変更内容**:
1. `@theme inline` ブロックに以下を追加:
   ```css
   --font-display: var(--font-instrument-serif);
   ```

2. `--font-sans` 変数を置き換え:
   ```css
   /* 変更前 */
   --font-sans: var(--font-geist-sans)

   /* 変更後 */
   --font-sans: var(--font-noto-sans-jp), "Hiragino Kaku Gothic ProN", sans-serif
   ```

3. ボーダー色の微調整（わずかに明るく、圧迫感を軽減）:
   ```css
   --color-grok-border: #ebebeb  /* 変更前 #e5e5e5 */
   ```

4. テキストセカンダリ色を Zinc系に統一:
   ```css
   --color-grok-text-secondary: #71717a  /* 変更前 #6b7280 */
   ```

5. 新規ユーティリティクラス `.font-display` 追加:
   ```css
   @layer utilities {
     .font-display {
       font-family: var(--font-display), "Georgia", serif;
       letter-spacing: -0.02em;
     }
   }
   ```

6. トランジション時間を微調整（より小気味良く）:
   ```css
   .transition-grok {
     transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);  /* 変更前 0.2s */
   }
   ```

---

### Priority 2 — `app/layout.tsx` — フォント読み込み設定
**ファイルパス**: `/home/koyomaru/teddy/app/layout.tsx`

**目的**:
- Priority 1 で定義した CSS変数を実際のフォントファイルと紐付け
- Google Fonts（Instrument Serif, Noto Sans JP）をアプリケーション全体に統合
- Next.js の `next/font/google` 機構を活用し、ビルド時のフォント最適化を実現

**期待効果**:
- セリフ体・サンセリフ体が全ページで統一される
- 日本語テキストのレンダリング品質が劇的に向上（Noto Sans JP の品質）
- フォント読み込み遅延を最小化（`display: "swap"` によるCumulative Layout Shift削減）
- ブラウザキャッシュの活用により、リピートアクセス時のパフォーマンスが向上

**ビジュアル変化**:
- **本文フォント**: Geist Sans → Noto Sans JP に完全置換（日本語がより読みやすく、上質に見える）
- **ロゴ・見出し**: Instrument Serif（セリフ体）が全ページで使用可能に（Teddyが「高級感のあるブランド」らしく見える）
- **日本語テキスト**: OSフォントフォールバックから脱却 → グリフが揃い、均一な美しさが出る
- **ページロード時**: フォント切り替わりが緩和される（CLS低下 → ユーザーが安定感を感じる）

**変更内容**:
1. imports を以下に変更:
   ```tsx
   import { Geist_Mono } from "next/font/google";
   import { Instrument_Serif } from "next/font/google";
   import { Noto_Sans_JP } from "next/font/google";

   // 削除: import { Geist } from "next/font/google";
   ```

2. フォント定義追加:
   ```tsx
   const instrumentSerif = Instrument_Serif({
     variable: "--font-instrument-serif",
     subsets: ["latin"],
     weight: "400",
     style: ["normal", "italic"],
     display: "swap",
   });

   const notoSansJP = Noto_Sans_JP({
     variable: "--font-noto-sans-jp",
     subsets: ["latin"],
     weight: ["400", "500", "600", "700"],
     display: "swap",
   });

   const geistMono = Geist_Mono({
     variable: "--font-geist-mono",
     subsets: ["latin"],
   });
   ```

3. `body` classNameの更新:
   ```tsx
   className={`${instrumentSerif.variable} ${notoSansJP.variable} ${geistMono.variable} antialiased min-h-screen bg-white`}
   ```

**注意**: `Noto_Sans_JP` は `subsets: ["latin"]` を指定しても、Google CDN が自動的に日本語グリフを配信するため、`japanese` サブセットの明示的指定は不要です。

---

### Priority 3 — `app/page.tsx` — トップページ（ダッシュボード）
**ファイルパス**: `/home/koyomaru/teddy/app/page.tsx`

**目的**:
- 初訪問ユーザーに対してブランドアイデンティティの第一印象を確立
- Teddyのロゴをセリフ体で「デザインされた意図」を視覚的に表現
- 機能カードの視覚階層を改善し、CTAの効果を高める
- UI全体のプロフェッショナル感を底上げ

**期待効果**:
- Instrument Serif の使用でロゴ部分が高級感を帯びる
- アイコンをコンテナで囲むことで、空間が整理され、スキャンしやすくなる
- ホバーシャドウの精密化で、インタラクティブ性が向上
- 見出しのタイポグラフィ（小ぶり・uppercase）がプロフェッショナル感を演出

**ビジュアル変化**:
- **Teddy ロゴ**: サンセリフ（Geist Sans） → **セリフ体（Instrument Serif）** に変更（「Teacher & Buddy」が小ぶりで uppercase に → ロゴ全体がより格式高い）
- **セクション見出し（「機能一覧」）**: `text-xl font-semibold` → `text-sm tracking-widest uppercase`（小ぶりで管理画面的なプロ感）
- **機能カードのアイコン**: 素のアイコン → **灰色背景のコンテナで囲まれたアイコン**に（空間が整理され、UIが精密に見える）
- **ホバー時**: シャドウが `shadow-md` から `shadow-[0_2px_16px_rgba(0,0,0,0.06)]` に洗練（より繊細な陰影）

**変更内容**:

#### 3-1. ロゴセクション
```tsx
{/* 変更前 */}
<h1 className="text-4xl font-semibold tracking-tight text-gray-900 mb-1">Teddy</h1>
<p className="text-sm text-gray-500">Teacher &amp; Buddy</p>

{/* 変更後 */}
<h1 className="font-display text-5xl text-gray-900 mb-1" style={{ letterSpacing: "-0.02em" }}>
  Teddy
</h1>
<p className="text-xs tracking-[0.15em] text-gray-400 uppercase">Teacher &amp; Buddy</p>
```

- `font-display` で Instrument Serif（セリフ体）を適用
- サイズを `text-4xl → text-5xl` に拡大
- サブタイトルを `uppercase + wider letter-spacing` でより洗練

#### 3-2. セクション見出し
```tsx
{/* 変更前 */}
<h2 className="text-xl font-semibold mb-1">機能一覧</h2>
<p className="text-sm text-gray-500 mb-6">各機能を選んでチャットを開始できます。</p>

{/* 変更後 */}
<h2 className="text-sm font-medium tracking-widest text-gray-400 uppercase mb-1">機能一覧</h2>
<p className="text-sm text-gray-500 mb-6">各機能を選んでチャットを開始できます。</p>
```

見出しを小ぶりで uppercase に → 管理画面的なプロフェッショナル感

#### 3-3. 機能カードの改善
```tsx
{/* 変更前 */}
<Link
  href={item.href}
  className="border border-gray-200 rounded-2xl p-5 bg-white hover:shadow-md hover:border-gray-400 transition-all"
>

{/* 変更後 */}
<Link
  href={item.href}
  className="border border-[#ebebeb] rounded-2xl p-5 bg-white hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all duration-200 group"
>
```

- ボーダー色を `#ebebeb` に統一（globals.css変数と連動）
- ホバーシャドウを改善（より洗練）
- `group` クラスを追加（子要素のホバー状態制御用）

#### 3-4. アイコンコンテナの追加
```tsx
{/* 変更前 */}
<div className="flex items-center gap-2 mb-3">
  <IconComponent className="w-5 h-5" />
  <span className="font-semibold text-sm">{item.label}</span>
</div>

{/* 変更後 */}
<div className="flex items-center gap-2.5 mb-3">
  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
    <IconComponent className="w-4 h-4 text-gray-700" />
  </div>
  <span className="font-medium text-sm text-gray-900">{item.label}</span>
</div>
```

アイコンを専用コンテナで包む → より整理され、ホバー時に背景が変わる洗練された動き

---

### Priority 4 — `app/auth/signin/page.tsx` — サインインページ
**ファイルパス**: `/home/koyomaru/teddy/app/auth/signin/page.tsx`

**目的**:
- ログイン時に、ユーザーが「信頼できるプロフェッショナルなアプリ」という印象を確立
- 背景グリッド + ロゴで Teddy ブランドの格を演出
- セリフ体フォント + 微妙なシャドウで、洗練度を視覚化
- 認証フロー全体のテンション感を高める

**期待効果**:
- グリッドパターン + フォーカスグロー（白い円形ぼかし）により、デスクトップUIとしてのプロフェッショナル感が大きく向上
- ロゴセクションの追加で、Teddy という固有のブランドイメージがユーザーに刻み込まれる
- Googleボタンの微妙なシャドウで、押下可能性が高まる
- 全体的に「大手サービスの認証画面」という親密度が上がる

**ビジュアル変化**:
- **背景**: 白 → **淡いグレー（#fafafa）に、微細なグリッドパターン + 白い円形ぼかしを重ねた奥行きのある背景**（デスクトップUIらしい洗練）
- **カード上部にロゴセクション追加**: Teddyアイコン + **セリフ体の「Teddy」テキスト**（ユーザーが一目で「Teddyアプリ」と認識）
- **見出し**: 「サインイン」 → **小ぶりで uppercase の「Sign In」**（プロフェッショナル感）
- **Googleボタン**: 単調なボタン → **微妙なシャドウが浮き上がった見た目**（押下感が高まる）
- **カードシャドウ**: 従来のシャドウ → **二層構造のシャドウ（遠景 + 近景）** に洗練（カードが浮き上がってみえる）

**変更内容**:

#### 4-1. 背景の装飾化
```tsx
{/* 変更前 */}
<div className="min-h-screen bg-white flex items-center justify-center p-4">

{/* 変更後 */}
<div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 relative overflow-hidden">
  {/* 背景グリッドパターン */}
  <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:64px_64px] opacity-60" />

  {/* フォーカスグロー（背景の中央に白い円形のぼかし） */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl opacity-80" />
```

微妙なグリッドパターンと白い円形ぼかしで深さを表現 → プロフェッショナルで洗練

#### 4-2. カード構造にロゴ追加
```tsx
<div className="w-full max-w-md relative">  {/* relative を追加 */}
  <div className="relative bg-white border border-[#e8e8e8] rounded-2xl p-8 shadow-[0_1px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]">

    {/* ロゴセクション（カード上部に） */}
    <div className="flex flex-col items-center mb-6">
      <Image
        src="/Teddy_icon.PNG"
        alt="Teddy"
        width={44}
        height={44}
        className="rounded-xl mb-3 shadow-sm"
      />
      <span className="font-display text-2xl text-gray-900" style={{ letterSpacing: "-0.02em" }}>
        Teddy
      </span>
    </div>

    {/* 既存の見出し〜ボタンの内容 */}
    ...
```

#### 4-3. 見出しの修正
```tsx
{/* 変更前 */}
<h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">サインイン</h2>

{/* 変更後 */}
<h2 className="text-sm font-medium tracking-widest text-gray-400 uppercase mb-2 text-center">
  Sign In
</h2>
```

英字 "Sign In" + uppercase でブランド感を強調

#### 4-4. Googleボタンの微調整
```tsx
{/* 変更前 */}
className={cn(
  "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
  "bg-white text-gray-900 font-medium border border-gray-300",
  "hover:bg-gray-50 transition-all duration-200",
  ...
)}

{/* 変更後 */}
className={cn(
  "w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl",
  "bg-white text-gray-800 font-medium border border-[#e0e0e0]",
  "hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200",
  "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
  ...
)}
```

- 微妙なシャドウを追加
- ボーダー色を `#e0e0e0` に統一
- ホバー時にシャドウが出現する洗練

---

### Priority 5 — `components/layout/Sidebar.tsx` — サイドバー
**ファイルパス**: `/home/koyomaru/teddy/components/layout/Sidebar.tsx`

**目的**:
- チャット操作中のアプリケーション固有性を強化（Teddyというブランドを常に意識させる）
- ロゴのセリフ体化で Priority 3・4 との視覚的一貫性を確立
- アクティブインジケーター・バッジの精密化で、UI細部の品質を上げる
- サイドバー全体の「整理された感覚」を演出

**期待効果**:
- Instrument Serif ロゴが全ページで一貫して表示される（ブランド定着）
- アクティブインジケーターを細くすることで、ミニマルでシャープな印象が強化
- プラスバッジのリングエフェクトで、新規作成ボタンが「浮き上がった」ように見え、操作性が向上
- サイドバー全体が統一された配色・タイポグラフィで、ナビゲーション体験が統制される

**ビジュアル変化**:
- **ロゴテキスト「Teddy」**: サンセリフ → **セリフ体（Instrument Serif）** に変更（他ページと統一、ブランド感強化）
- **UP AI バッジ**: 標準サイズ → **より小ぶり（text-[10px]）で tracking-wider**（より精密で洗練）
- **アクティブインジケーター**: 太い棒（`w-[3px] h-6`） → **細くシャープな棒（`w-[2px] h-5`）**（ミニマリズム強調）
- **プラスバッジ**: シンプルな円 → **ring-2 ring-[#f9f9f9] で浮き上がった効果** → バッジが背景から浮遊して見える（操作可能性が明示される）

**変更内容**:

#### 5-1. ロゴセクション
```tsx
{/* 変更前 */}
<div className="px-4 pt-4 pb-2 flex items-center gap-2">
  <span className="bg-black text-white text-xs font-black px-2 py-1 rounded">UP AI</span>
  <span className="font-bold text-xl text-[#1a1a1a] tracking-tight">Teddy</span>
</div>

{/* 変更後 */}
<div className="px-4 pt-5 pb-3 flex items-center gap-2.5">
  <span className="bg-[#1a1a1a] text-white text-[10px] font-semibold px-2 py-1 rounded-md tracking-wider">UP AI</span>
  <span className="font-display text-lg text-[#1a1a1a]" style={{ letterSpacing: "-0.01em" }}>
    Teddy
  </span>
</div>
```

- `font-display` で Instrument Serif 適用
- UP AI バッジのサイズ・トラッキング微調整

#### 5-2. アクティブインジケーター
```tsx
{/* 変更前 */}
<div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-black rounded-r-full" />

{/* 変更後 */}
<div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#1a1a1a] rounded-r-full" />
```

シャープに（幅を3px→2px、高さを6→5に）

#### 5-3. プラスバッジ（新規作成ボタン）
```tsx
{/* 変更前 */}
<div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full flex items-center justify-center">
  <Plus className="w-2 h-2 text-white" />
</div>

{/* 変更後 */}
<div className="absolute -top-1 -right-1 w-3 h-3 bg-[#1a1a1a] rounded-full flex items-center justify-center ring-2 ring-[#f9f9f9]">
  <Plus className="w-2 h-2 text-white" />
</div>
```

`ring-2 ring-[#f9f9f9]` を追加 → バッジが背景から浮き上がって見える効果

---

### Priority 6 — `app/(authenticated)/chat/history/page.tsx` — チャット履歴ページ
**ファイルパス**: `/home/koyomaru/teddy/app/(authenticated)/chat/history/page.tsx`

**目的**:
- データ一覧としての見栄えをプロフェッショナル化
- フィルターボタンをアウトライン化することで、UIの「軽さ」と「操作の明確さ」を同時に実現
- ヘッダーアイコンをフラット化し、全体的なミニマルエレガンス美学に統一
- カードホバーの洗練で、リスト操作時のレスポンスを高める

**期待効果**:
- ヘッダーアイコンが黒塗り → フラットグレーになることで、ページ全体の圧迫感が軽減
- フィルターボタンがアウトライン（白背景）になることで、ページが「より選択肢を提供している」感覚を与える
- 機能アイコンコンテナが軽くなり、リスト全体のスキャン性が向上
- ホバーシャドウの精密化で、データとの相互作用が自然に感じられる

**ビジュアル変化**:
- **ページヘッダーアイコン**: 黒塗りの大きな正方形 → **淡いグレー背景（#f4f4f5）+ border** で軽い印象（圧迫感が軽減）
- **フィルターボタン**:
  - 非アクティブ: グレー塗り → **白背景 + グレーボーダー（outline 風）**（選択肢が明確に）
  - アクティブ: 変更なし（黒背景のまま）
- **機能アイコンコンテナ**: グレー背景 → **白背景 + ボーダー**（リスト全体が「軽い」「スッキリ」した見た目）
- **ホバーシャドウ**: `shadow-md` → **より精密な 2-layer shadow**（カードが自然に浮き上がる）

**変更内容**:

#### 6-1. ページヘッダー
```tsx
{/* 変更前 */}
<div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
  <History className="w-6 h-6 text-white" />
</div>
<h1 className="text-3xl font-bold text-gray-900">チャット履歴</h1>

{/* 変更後 */}
<div className="w-10 h-10 rounded-xl bg-[#f4f4f5] border border-[#ebebeb] flex items-center justify-center">
  <History className="w-5 h-5 text-gray-600" />
</div>
<h1 className="text-2xl font-semibold text-gray-900 tracking-tight">チャット履歴</h1>
```

黒い背景のアイコンをフラットなグレーに → より洗練

#### 6-2. フィルターボタン
```tsx
{/* 変更前 */}
className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
  isActive
    ? "bg-gray-900 text-white"
    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
}`}

{/* 変更後 */}
className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
  isActive
    ? "bg-[#1a1a1a] text-white shadow-sm"
    : "bg-white text-gray-600 border border-[#e8e8e8] hover:bg-gray-50 hover:border-gray-300"
}`}
```

非アクティブを「塗り」から「アウトライン」に → すっきりした印象

#### 6-3. 履歴カードのホバー
```tsx
{/* 変更前 */}
className="cursor-pointer hover:shadow-md transition-shadow"

{/* 変更後 */}
className="cursor-pointer hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all duration-150"
```

#### 6-4. 機能アイコンコンテナ
```tsx
{/* 変更前 */}
<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
  <FeatureIcon className="w-5 h-5 text-gray-600" />
</div>

{/* 変更後 */}
<div className="w-9 h-9 rounded-lg bg-white border border-[#ebebeb] flex items-center justify-center flex-shrink-0">
  <FeatureIcon className="w-4 h-4 text-gray-500" />
</div>
```

グレー背景から白 + border に → より軽やか

---

### Priority 7（任意）— チャット関連コンポーネント細部微調整
**ファイルパス**: 以下4ファイル（優先度は低め。1〜6で十分な改善が見込める）

**目的**:
- チャット操作領域での細部品質を高める（必須ではなく、余裕があれば実施）
- Priority 1〜6 での統一されたカラーパレット・シャドウシステムをチャット本体にも波及
- ユーザーメッセージバブル・AIアバター・入力フィールドの視覚的統一を実現
- 全体的な「洗練度」を最大化

**期待効果**:
- グラデーション廃止 → フラット化により、ミニマリズムがより徹底される
- ユーザーバブルがgrok-text (#1a1a1a) に統一されることで、全アプリケーション全体の配色が一貫化
- 入力フィールド・送信ボタンが落ち着いた色調になり、長時間の操作でも疲労が少ない
- 空状態アイコンが控えめになることで、「操作を促す」のではなく「静かに存在する」バランス感

**ビジュアル変化**（全4ファイル共通）:
- **グラデーション廃止**: グラデーション背景 → **フラットなグレー背景（#f4f4f5 等）** に統一（ミニマルで落ち着いた雰囲気）
- **ユーザーメッセージバブル**: グレー系 → **濃い黒（#1a1a1a）** に統一（会話がより明確）
- **入力フィールド**: 標準 → **#fafafa 背景 + #e8e8e8 ボーダー** （柔らかく、圧迫感なし）
- **送信ボタン**: 標準 → **#1a1a1a 背景、ホバー時 #333333** に統一（ユーザーバブルと色を揃える）
- **空状態アイコン**: 目立つ色 → **控えめなグレー**（押し付けない印象）

#### 7-1. `components/ui/ChatHeader.tsx`
- アイコンコンテナのグラデーション廃止 → `bg-gray-50 border border-gray-100` のフラット化
- `py-4 → py-3.5` で引き締め

#### 7-2. `components/ui/MessageBubble.tsx`
- ユーザーメッセージバブル: `bg-gray-800 → bg-[#1a1a1a]`（grok-text変数と統一）
- AIアバター: `bg-white border border-[#ebebeb]`

#### 7-3. `components/ui/ChatInputArea.tsx`
- 入力ボックス: `bg-[#fafafa] border-[#e8e8e8] rounded-xl`
- 送信ボタン: `bg-[#1a1a1a] hover:bg-[#333333]`

#### 7-4. `components/ui/ChatMessages.tsx` （空状態）
- 空状態アイコンのグラデーション → フラット（`bg-white border border-[#ebebeb]`）
- アイコン色: `text-gray-900 → text-gray-400` で控えめに

---

## 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `components/ui/MarkdownRenderer.tsx` | コードブロックの スタイルが現状で高品質 |
| `components/ui/badge.tsx`, `button.tsx` 等 | shadcn/ui コンポーネント。手を入れない |
| `components/chat/ProgramSelectionView.tsx` | `globals.css` の変数変更で自動連動 |
| `components/chat/PromptSuggestions.tsx` | 同上 |

---

## 注意事項

### 1. Noto Sans JP のサブセット指定
Next.js の `next/font/google` では `Noto_Sans_JP` に対して `subsets: ["latin"]` を指定しても、Google CDN が自動的に日本語グリフを配信します。通常は `subsets: ["japanese"]` と指定しますが、`latin` を指定した場合でも動作に問題ありません。

### 2. Instrument Serif の使用範囲を厳格に限定
`font-display` クラスの使用箇所：
- `app/page.tsx` の `<h1>Teddy</h1>`
- `app/auth/signin/page.tsx` の `<span>Teddy</span>`
- `components/layout/Sidebar.tsx` の Teddyロゴ
- `components/chat/MobileChatHeader.tsx` の Teddyテキスト

それ以外の見出しは Noto Sans JP または既存フォントのままで。スペイン語で **"display" フォントは英字見出しのみ** という原則を守ること。

### 3. アニメーションは framer-motion なし
- サインインページの背景グリッドパターンは純CSS（`background-image: linear-gradient`）で実装
- Tailwind の任意値構文（`bg-[linear-gradient(...)]`）を活用
- 時間のあるトランジションは `.transition-grok`（0.15s）クラスで統一

### 4. ビルド時の日本語フォントプリロード
`Noto_Sans_JP` は `display: "swap"` で読み込む → フォント読み込み中のシフトを最小化

---

## 実装順序と検証フロー

### Step 1 — globals.css + layout.tsx
フォント設定が基盤。ここが安定すれば、後は個々のページファイルへの変更。

```bash
npm run dev
# ローカルで起動し、フォントが正しく読み込まれているか（Instrument Serif が見出しに適用される）確認
```

### Step 2 — トップページ（Priority 3）
```bash
# http://localhost:3000 → Teddyロゴがセリフ体か確認
# 機能カードのホバーシャドウが正しく表示されるか確認
```

### Step 3 — サインインページ（Priority 4）
```bash
# http://localhost:3000/auth/signin → 背景グリッド・ロゴ・シャドウを確認
# Teddyアイコンが画像として表示されるか確認
```

### Step 4 — サイドバー（Priority 5）
```bash
# http://localhost:3000/chat → Teddyロゴがセリフ体、アクティブインジケーター・バッジが洗練されているか確認
```

### Step 5 — 履歴ページ（Priority 6）
```bash
# http://localhost:3000/chat/history → フィルターボタン・カード・ヘッダーアイコンを確認
```

### Step 6（任意）— チャット詳細（Priority 7）
需要に応じて、チャットウィンドウ内のメッセージバブルなど微調整。

### Step 7 — モバイル検証
```bash
# DevTools で 375px の幅に縮小 → レイアウト崩れなく、読みやすいか確認
```

---

## 期待される改善効果

| 改善点 | 効果 |
|--------|------|
| **Instrument Serif ロゴ** | Teddyのブランドアイデンティティが明確化。第一印象が「有機的」に。|
| **Noto Sans JP 本文** | 日本語品質が向上。OSフォントフォールバックから脱却。 |
| **背景グリッド（サインイン）** | デスクトップUIのプロフェッショナル感が増加。 |
| **シャドウの洗練** | グラデーション廃止 → ミニマリズムを強調。 |
| **ボーダー色の統一** | `#ebebeb` 中心で、全体的に一貫性が出る。 |
| **フィルターボタンのアウトライン化** | UIが軽くなり、操作感が向上。 |

---

## 補足：フォント選定の根拠

### Instrument Serif（見出し英字）
- **特徴**: セリフ体、Google Fonts対応、Next.js 完全互換
- **用途**: ロゴ・主見出しのみ（英字）
- **理由**: Geist Sans との対比が明確 → 「設計されたブランド感」が出る。イタリック体もあり、アクセント表現に柔軟性あり。

### Noto Sans JP（本文）
- **特徴**: サンセリフ体、Google Fonts、可変ウェイト対応（パフォーマンス良好）
- **用途**: 本文・UI要素全般（日本語含む）
- **理由**: 現状の Geist Sans（英字のみ）から完全に置き換え。日本語グリフの品質が劇的に向上。Noto ファミリーは世界で最も広い言語対応 → 信頼性高い。

---

## リソース参照

- **Tailwind CSS v4**: `globals.css` 内の `@theme` 構文（tailwind.config.ts 不要）
- **Google Fonts**: Instrument Serif, Noto Sans JP
- **Next.js `next/font`**: `app/layout.tsx` で管理
- **shadcn/ui**: 既存UIコンポーネントは変更なし（CSS変数の流れで自動適応）
- **Lucide React**: アイコンライブラリ（既存、変更なし）

