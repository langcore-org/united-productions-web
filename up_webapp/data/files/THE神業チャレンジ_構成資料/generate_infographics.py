#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
THE神業チャレンジ 2時間SP「天才Kids対決」 インフォグラフィック生成スクリプト
生成対象: 5点のビジュアル資料

Requirements:
    - matplotlib
    - Pillow
    - numpy
    - japanize-matplotlib
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon
import numpy as np
import os
from pathlib import Path
from datetime import datetime

# 日本語フォント対応
import japanize_matplotlib

# カラーパレット定義
COLORS = {
    'navy': '#1A3A52',
    'orange': '#FF6B35',
    'green': '#2E8B57',
    'purple': '#9370DB',
    'red': '#E74C3C',
    'light_orange': '#FFB347',
    'light_purple': '#B19CD9',
    'light_green': '#90EE90',
    'gray': '#555555',
    'light_gray': '#CCCCCC',
    'dark_gray': '#2C3E50'
}

# 出力設定
OUTPUT_DIR = Path("/Users/sangyeolyi/Dev/LangCore/cli_proxy/next-chat-ui-cc-wrapper/data/files/THE神業チャレンジ_構成資料")
DPI = 300
FIGSIZE = (11.69, 8.27)  # A4横

class InfographicGenerator:
    """インフォグラフィック生成クラス"""

    def __init__(self, output_dir, dpi=300):
        self.output_dir = Path(output_dir)
        self.dpi = dpi
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def save_figure(self, fig, filename):
        """図を保存"""
        filepath = self.output_dir / filename
        fig.savefig(filepath, dpi=self.dpi, bbox_inches='tight', facecolor='white')
        print(f"✅ 保存完了: {filepath}")
        plt.close(fig)

    def generate_infographic_1(self):
        """Infographic #1: 番組全体構成図"""
        fig, axes = plt.subplots(2, 2, figsize=FIGSIZE)
        fig.suptitle('THE 神業チャレンジ 90分構成とターゲット心理',
                     fontsize=20, fontweight='bold', y=0.98)

        # パネル1: 時間軸・セグメント配置
        ax1 = axes[0, 0]
        ax1.set_xlim(0, 90)
        ax1.set_ylim(0, 10)

        segments = [
            (0, 2.5, 'OP', COLORS['light_purple']),
            (2.5, 30, '本編1\n激セマ駐車', COLORS['light_orange']),
            (30, 33, 'CM①', COLORS['light_gray']),
            (33, 55, '本編2-A\n天才Kids対決', COLORS['green']),
            (55, 58, 'CM②', COLORS['light_gray']),
            (58, 75, '本編2-B\n後半', COLORS['light_purple']),
            (75, 85, '本編3\n100人神業', COLORS['light_orange']),
            (85, 90, 'ED', COLORS['light_gray']),
        ]

        for start, end, label, color in segments:
            width = end - start
            rect = FancyBboxPatch((start, 3), width, 4,
                                  boxstyle="round,pad=0.1",
                                  facecolor=color, edgecolor='black', linewidth=1.5)
            ax1.add_patch(rect)
            ax1.text(start + width/2, 5, label, ha='center', va='center',
                    fontsize=10, fontweight='bold')

        ax1.set_xlabel('放送時間（分）', fontsize=11, fontweight='bold')
        ax1.set_title('セグメント配置', fontsize=12, fontweight='bold', pad=10)
        ax1.set_yticks([])
        ax1.spines['left'].set_visible(False)
        ax1.spines['right'].set_visible(False)
        ax1.spines['top'].set_visible(False)

        # パネル2: C・T層の感情曲線
        ax2 = axes[0, 1]
        time = np.array([0, 2.5, 30, 33, 55, 58, 75, 85, 90])
        ct_emotion = np.array([2, 4, 8, 3, 4, 5, 9, 6, 4])

        ax2.plot(time, ct_emotion, linewidth=3, color=COLORS['orange'],
                marker='o', markersize=8, label='C・T層（子供・ティーン）')
        ax2.fill_between(time, ct_emotion, alpha=0.3, color=COLORS['orange'])
        ax2.set_xlim(0, 90)
        ax2.set_ylim(0, 10)
        ax2.set_xlabel('放送時間（分）', fontsize=11, fontweight='bold')
        ax2.set_ylabel('興奮度', fontsize=11, fontweight='bold')
        ax2.set_title('C・T層の感情曲線', fontsize=12, fontweight='bold', pad=10)
        ax2.grid(True, alpha=0.3, linestyle='--')
        ax2.legend(loc='upper left', fontsize=10)

        # パネル3: 親世代の感情曲線
        ax3 = axes[1, 0]
        parent_emotion = np.array([1, 2, 3, 5, 6, 8, 8, 7, 6])

        ax3.plot(time, parent_emotion, linewidth=3, color=COLORS['navy'],
                marker='s', markersize=8, label='親世代（30-50代）')
        ax3.fill_between(time, parent_emotion, alpha=0.3, color=COLORS['navy'])
        ax3.set_xlim(0, 90)
        ax3.set_ylim(0, 10)
        ax3.set_xlabel('放送時間（分）', fontsize=11, fontweight='bold')
        ax3.set_ylabel('関心度・行動決意', fontsize=11, fontweight='bold')
        ax3.set_title('親世代の感情曲線', fontsize=12, fontweight='bold', pad=10)
        ax3.grid(True, alpha=0.3, linestyle='--')
        ax3.legend(loc='upper left', fontsize=10)

        # パネル4: 全体メッセージング
        ax4 = axes[1, 1]
        ax4.axis('off')

        messages = [
            "🎯 ターゲット：C・T層 + 親世代",
            "📌 コアコンセプト：「神業」×「才能教育」",
            "",
            "📊 視聴率目標：",
            "   初回 8-10% / 継続 7-9%",
            "",
            "💡 親層エンゲージメント最高峰",
            "   （SNS拡散・会話ネタ化）"
        ]

        y_pos = 0.9
        for msg in messages:
            ax4.text(0.1, y_pos, msg, fontsize=11, family='monospace',
                    verticalalignment='top', transform=ax4.transAxes)
            y_pos -= 0.11

        plt.tight_layout()
        self.save_figure(fig, '01_番組全体構成.png')

    def generate_infographic_2(self):
        """Infographic #2: 出演者・ターゲット心理マップ"""
        fig = plt.figure(figsize=FIGSIZE)
        gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

        fig.suptitle('出演者とターゲット心理マップ',
                     fontsize=20, fontweight='bold', y=0.98)

        # 4象限マップ
        ax_map = fig.add_subplot(gs[0, :])

        ax_map.set_xlim(-5, 5)
        ax_map.set_ylim(-5, 5)
        ax_map.axhline(y=0, color='black', linewidth=1.5)
        ax_map.axvline(x=0, color='black', linewidth=1.5)

        # 象限ラベル
        ax_map.text(0, 4.5, '親世代向け', fontsize=12, ha='center', fontweight='bold')
        ax_map.text(0, -4.5, 'C・T層向け', fontsize=12, ha='center', fontweight='bold')
        ax_map.text(-4.5, 0, '知識・教育', fontsize=12, ha='center', rotation=90, fontweight='bold')
        ax_map.text(4.5, 0, 'エンタメ性', fontsize=12, ha='center', rotation=90, fontweight='bold')

        # 出演者の配置
        talents = [
            (3, 3, 'チョコプラ\n（進行）', COLORS['green']),
            (3, 2.5, 'いざわ\n（クイズ）', COLORS['green']),
            (-3, 3, '学芸員\n（インタビュー）', COLORS['purple']),
            (-3, 2.5, '教育学者\n（専門家）', COLORS['purple']),
            (2, -2, '林大智\n（天才Kid）', COLORS['orange']),
            (0, -3, '親の声\n（ドキュメンタリー）', COLORS['navy']),
        ]

        for x, y, label, color in talents:
            circle = plt.Circle((x, y), 0.8, color=color, alpha=0.6, zorder=10)
            ax_map.add_patch(circle)
            ax_map.text(x, y, label, ha='center', va='center',
                       fontsize=9, fontweight='bold', zorder=11)

        ax_map.set_xticks([])
        ax_map.set_yticks([])
        ax_map.spines['left'].set_visible(False)
        ax_map.spines['right'].set_visible(False)
        ax_map.spines['top'].set_visible(False)
        ax_map.spines['bottom'].set_visible(False)
        ax_map.set_title('出演者の訴求軸マップ', fontsize=12, fontweight='bold', pad=10)

        # 詳細セル（下部）
        ax_detail = fig.add_subplot(gs[1, :])
        ax_detail.axis('off')

        details = [
            ("チョコプラ", "全体司会", "親→親子で見る価値 / C・T→安心感"),
            ("いざわたくし", "クイズバトル", "両層→大人も苦戦、でも必死に頑張る姿"),
            ("林大智", "知識・体験ガイド", "C・T→同年代の天才 / 親→親のサポートモデル"),
            ("学芸員", "専門家インタビュー", "親→才能発掘のヒント・信頼性"),
            ("教育学者", "親向けメッセージ", "親→実行可能なアドバイス"),
        ]

        y_pos = 0.95
        for name, role, message in details:
            ax_detail.text(0.02, y_pos, f"【{name}】", fontsize=11, fontweight='bold',
                          transform=ax_detail.transAxes)
            ax_detail.text(0.25, y_pos, f"役割: {role}", fontsize=10,
                          transform=ax_detail.transAxes)
            ax_detail.text(0.5, y_pos, f"訴求: {message}", fontsize=10,
                          transform=ax_detail.transAxes, style='italic')
            y_pos -= 0.18

        self.save_figure(fig, '02_出演者とターゲット心理.png')

    def generate_infographic_3(self):
        """Infographic #3: 本編2-A「天才Kids対決・前半」セグメント詳細図"""
        fig, axes = plt.subplots(2, 2, figsize=FIGSIZE)
        fig.suptitle('本編2-A「天才Kids対決・前半」セグメント詳細図\n（最重要セグメント 33:00～55:00）',
                     fontsize=18, fontweight='bold', y=0.98)

        segments = [
            (axes[0, 0], 'セクション1: OP・自己紹介', 'スタジオの明るいセット',
             '「え？この子、本当にすごいの？」', COLORS['light_purple']),
            (axes[0, 1], 'セクション2: 第1ラウンドクイズ', 'スタジオでのクイズセット',
             '「天才Kid、すごい！」', COLORS['light_orange']),
            (axes[1, 0], 'セクション3: 生い立ちVTR', '温かい家庭映像、図書館・博物館',
             '「『好き』をサポートが大事」', COLORS['light_green']),
            (axes[1, 1], 'セクション4: ロケ体験「化石発掘」', '福井県立恐竜博物館',
             '「本当に『神業』だ」', COLORS['green']),
        ]

        for ax, title, image_desc, emotion, color in segments:
            # 背景色
            rect = FancyBboxPatch((0.05, 0.05), 0.9, 0.9,
                                  boxstyle="round,pad=0.05",
                                  transform=ax.transAxes,
                                  facecolor=color, alpha=0.3, edgecolor='black', linewidth=2)
            ax.add_patch(rect)

            # テキスト
            ax.text(0.5, 0.85, title, ha='center', va='top', fontsize=12, fontweight='bold',
                   transform=ax.transAxes)
            ax.text(0.5, 0.65, f"📸 {image_desc}", ha='center', va='top', fontsize=10,
                   transform=ax.transAxes, style='italic')
            ax.text(0.5, 0.35, f"💭 視聴者心理:\n{emotion}", ha='center', va='center', fontsize=10,
                   transform=ax.transAxes, bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.axis('off')

        plt.tight_layout()
        self.save_figure(fig, '03_本編2A_セグメント詳細.png')

    def generate_infographic_4(self):
        """Infographic #4: 親向けメッセージング戦略図"""
        fig = plt.figure(figsize=FIGSIZE)
        gs = fig.add_gridspec(2, 1, height_ratios=[1, 1.5], hspace=0.4)

        fig.suptitle('親向けメッセージング戦略フロー',
                     fontsize=20, fontweight='bold', y=0.98)

        # ファネル図
        ax_funnel = fig.add_subplot(gs[0])

        stages = [
            ('視聴者全体', 10, '#D3D3D3'),
            ('親層への関心喚起\n「子どもの才能とは？」', 8, '#CCCCFF'),
            ('学習\n「他の親のサポート方法」', 6, '#9999FF'),
            ('共感\n「我が子にも『好き』がある」', 4, '#6666FF'),
            ('行動決意\n「明日から何ができるか」', 2.5, '#2E8B57'),
            ('参加\n「応募フォームへ」', 1.5, '#1A3A52'),
        ]

        y_pos = 5
        for i, (label, width, color) in enumerate(stages):
            left = (10 - width) / 2
            rect = FancyBboxPatch((left, y_pos - 0.4), width, 0.8,
                                  boxstyle="round,pad=0.05",
                                  facecolor=color, edgecolor='black', linewidth=1.5)
            ax_funnel.add_patch(rect)
            ax_funnel.text(5, y_pos, label, ha='center', va='center',
                          fontsize=10, fontweight='bold')
            y_pos -= 0.9

        ax_funnel.set_xlim(0, 10)
        ax_funnel.set_ylim(-1, 6)
        ax_funnel.axis('off')
        ax_funnel.set_title('親層への行動喚起フロー', fontsize=12, fontweight='bold', pad=10)

        # 4本柱メッセージング
        ax_pillars = fig.add_subplot(gs[1])
        ax_pillars.axis('off')

        pillars = [
            ("柱1", "子どもの可能性は親の関わりで決まる",
             "高額教育は不要 / 親が『好き』をサポート",
             "本編2-B（学芸員インタビュー）", COLORS['green']),
            ("柱2", "『好き』を見つけることが才能発掘の第一歩",
             "図書館・博物館・YouTube...無料リソース",
             "本編2-A（生い立ちVTR）", COLORS['orange']),
            ("柱3", "親子で『好き』を探す時間が、才能教育",
             "親の理解と応援が全て",
             "本編2-B（専門家インタビュー）", COLORS['purple']),
            ("柱4", "うちの子にも『好き』があるはず",
             "今日から家庭で何ができるか",
             "ED（参加企画告知）", COLORS['navy']),
        ]

        x_start = 0.02
        x_step = 0.24
        for i, (label, title, desc, impl, color) in enumerate(pillars):
            x_pos = x_start + i * x_step

            # 柱の背景
            rect = mpatches.Rectangle((x_pos, 0.05), 0.22, 0.9,
                                      transform=ax_pillars.transAxes,
                                      facecolor=color, alpha=0.2, edgecolor='black', linewidth=2)
            ax_pillars.add_patch(rect)

            # テキスト
            ax_pillars.text(x_pos + 0.11, 0.85, label, ha='center', va='top', fontsize=11, fontweight='bold',
                           transform=ax_pillars.transAxes, color=color)
            ax_pillars.text(x_pos + 0.11, 0.75, title, ha='center', va='top', fontsize=9, fontweight='bold',
                           transform=ax_pillars.transAxes, wrap=True)
            ax_pillars.text(x_pos + 0.11, 0.5, desc, ha='center', va='center', fontsize=8,
                           transform=ax_pillars.transAxes, style='italic', wrap=True)
            ax_pillars.text(x_pos + 0.11, 0.15, impl, ha='center', va='bottom', fontsize=7,
                           transform=ax_pillars.transAxes, bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

        ax_pillars.set_xlim(0, 1)
        ax_pillars.set_ylim(0, 1)
        ax_pillars.set_title('4本柱メッセージング', fontsize=12, fontweight='bold', pad=10)

        self.save_figure(fig, '04_親向けメッセージング戦略.png')

    def generate_infographic_5(self):
        """Infographic #5: CM跨ぎ戦略＆視聴者心理最適化図"""
        fig = plt.figure(figsize=FIGSIZE)
        gs = fig.add_gridspec(3, 2, hspace=0.4, wspace=0.3)

        fig.suptitle('CM跨ぎ戦略＆視聴者心理最適化図',
                     fontsize=20, fontweight='bold', y=0.98)

        # CM①跨ぎ詳細（左上）
        ax_cm1 = fig.add_subplot(gs[0, 0])
        ax_cm1.axis('off')
        cm1_text = """【CM①跨ぎ】30分地点
場面: 本編1「激セマ駐車」最終チャレンジ中
ナレーション引き方:
「大橋、2回連続失敗...
  3回目がラストチャンス！
  この後...」

煽りの工夫: 「ラストチャンス」で緊迫感

視聴者心理: 「結果が気になる！」

視聴率維持: 高
（エンターテインメント性 ✓）"""
        ax_cm1.text(0.05, 0.95, cm1_text, fontsize=10, family='monospace',
                   transform=ax_cm1.transAxes, verticalalignment='top',
                   bbox=dict(boxstyle='round', facecolor=COLORS['light_orange'], alpha=0.3))

        # CM②跨ぎ詳細（右上）★最重要
        ax_cm2 = fig.add_subplot(gs[0, 1])
        ax_cm2.axis('off')
        cm2_text = """【CM②跨ぎ】55分地点 ★最重要★
場面: 本編2-A終盤 → CM → 本編2-B

ナレーション引き方（両層同時引き）:
C・T層へ: 「いざわの逆転戦」
親層へ: 「教育情報」で引き込み

煽り:
「専門家が語る『天才児の育て方』とは？」

視聴率維持: 最高
（両層同時引き＆教育情報 ✓✓✓）"""
        ax_cm2.text(0.05, 0.95, cm2_text, fontsize=10, family='monospace',
                   transform=ax_cm2.transAxes, verticalalignment='top',
                   bbox=dict(boxstyle='round', facecolor=COLORS['light_purple'], alpha=0.3))

        # 視聴率推移グラフ
        ax_graph = fig.add_subplot(gs[1:, :])

        time = np.array([0, 2.5, 30, 33, 55, 58, 75, 85, 90])
        total_rate = np.array([9, 8.5, 8.2, 8.8, 7.9, 9.2, 8.1, 7, 6.5])
        ct_rate = np.array([8, 8.5, 9, 8.5, 7.8, 8, 9, 7, 6])
        parent_rate = np.array([5, 7, 6, 8.5, 8.2, 10, 8.5, 8, 8])

        ax_graph.plot(time, total_rate, linewidth=3, color=COLORS['dark_gray'],
                     marker='o', markersize=8, label='全体視聴率', zorder=10)
        ax_graph.plot(time, ct_rate, linewidth=2.5, color=COLORS['orange'],
                     linestyle='--', marker='o', markersize=6, label='C・T層視聴率', zorder=9)
        ax_graph.plot(time, parent_rate, linewidth=2.5, color=COLORS['navy'],
                     linestyle=':', marker='s', markersize=6, label='親層視聴率', zorder=8)

        # CM跨ぎポイントの強調
        ax_graph.axvline(x=30, color=COLORS['red'], linestyle='--', linewidth=2, alpha=0.5, label='CM①')
        ax_graph.axvline(x=55, color=COLORS['red'], linestyle='--', linewidth=3, alpha=0.7, label='CM②★')

        # アノテーション
        ax_graph.annotate('初回視聴率\n8-10%', xy=(0, 9), xytext=(5, 9.5),
                         arrowprops=dict(arrowstyle='->', color='black', lw=1),
                         fontsize=9, fontweight='bold')
        ax_graph.annotate('教育情報で\n親層急上昇', xy=(58, 9.2), xytext=(65, 10),
                         arrowprops=dict(arrowstyle='->', color=COLORS['navy'], lw=2),
                         fontsize=9, fontweight='bold', color=COLORS['navy'])

        ax_graph.set_xlim(-2, 92)
        ax_graph.set_ylim(4, 11)
        ax_graph.set_xlabel('放送時間（分）', fontsize=12, fontweight='bold')
        ax_graph.set_ylabel('視聴率（%）', fontsize=12, fontweight='bold')
        ax_graph.set_title('視聴率推移グラフ（層別）', fontsize=12, fontweight='bold', pad=10)
        ax_graph.grid(True, alpha=0.3, linestyle='--')
        ax_graph.legend(loc='lower left', fontsize=10, ncol=3)

        self.save_figure(fig, '05_CM跨ぎ戦略.png')

    def generate_all(self):
        """すべてのインフォグラフィックを生成"""
        print("=" * 60)
        print("THE 神業チャレンジ インフォグラフィック生成開始")
        print("=" * 60)

        try:
            print("\n📊 Infographic #1: 番組全体構成図")
            self.generate_infographic_1()

            print("\n📊 Infographic #2: 出演者・ターゲット心理マップ")
            self.generate_infographic_2()

            print("\n📊 Infographic #3: 本編2-A セグメント詳細図")
            self.generate_infographic_3()

            print("\n📊 Infographic #4: 親向けメッセージング戦略図")
            self.generate_infographic_4()

            print("\n📊 Infographic #5: CM跨ぎ戦略図")
            self.generate_infographic_5()

            print("\n" + "=" * 60)
            print("✅ すべてのインフォグラフィック生成完了！")
            print("=" * 60)
            print(f"\n📁 出力先: {self.output_dir}")

            # 生成されたファイル一覧
            files = sorted(self.output_dir.glob('*.png'))
            print("\n🎨 生成されたファイル:")
            for i, f in enumerate(files, 1):
                size_mb = f.stat().st_size / (1024 * 1024)
                print(f"   {i}. {f.name} ({size_mb:.2f} MB)")

        except Exception as e:
            print(f"\n❌ エラーが発生しました: {e}")
            raise

if __name__ == '__main__':
    generator = InfographicGenerator(OUTPUT_DIR, DPI)
    generator.generate_all()
