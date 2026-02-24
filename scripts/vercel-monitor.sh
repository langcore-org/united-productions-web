#!/bin/bash
# Vercelデプロイ監視スクリプト
# 使用方法: ./scripts/vercel-monitor.sh [プロジェクト名]

set -e

PROJECT="${1:-agent1}"
MAX_WAIT=300  # 5分待機
INTERVAL=10   # 10秒間隔

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 最新のデプロイメントを取得
get_latest_deployment() {
    vercel list "$PROJECT" 2>/dev/null | grep -E "https://$PROJECT-" | head -1 | awk '{print $NF}'
}

# デプロイメント状態を取得
get_deployment_status() {
    local url="$1"
    vercel inspect "$url" 2>/dev/null | grep "status" | awk '{print $2}'
}

# ビルドログを取得
get_build_logs() {
    local url="$1"
    vercel inspect "$url" --logs 2>&1
}

# ヘルプ表示
show_help() {
    echo "使用方法: $0 [プロジェクト名]"
    echo ""
    echo "オプション:"
    echo "  プロジェクト名  監視するVercelプロジェクト名（デフォルト: agent1）"
    echo ""
    echo "例:"
    echo "  $0              # agent1プロジェクトを監視"
    echo "  $0 my-app       # my-appプロジェクトを監視"
    echo ""
    echo "環境変数:"
    echo "  MAX_WAIT        最大待機時間（秒、デフォルト: 300）"
    echo "  INTERVAL        チェック間隔（秒、デフォルト: 10）"
}

# ヘルプオプション
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

echo "=== Vercelデプロイ監視開始 ==="
echo "プロジェクト: $PROJECT"
echo "最大待機時間: ${MAX_WAIT}秒"
echo "チェック間隔: ${INTERVAL}秒"
echo ""

# 現在の最新デプロイメントを記録
echo "現在の最新デプロイメントを確認..."
CURRENT_DEPLOY=$(get_latest_deployment)

if [ -z "$CURRENT_DEPLOY" ]; then
    echo -e "${RED}✗ エラー: デプロイメントが見つかりません${NC}"
    echo "プロジェクト名 '$PROJECT' が正しいか確認してください"
    exit 1
fi

echo "現在: $CURRENT_DEPLOY"

# 新しいデプロイメントを待機
echo ""
echo "新しいデプロイメントを待機中...（Ctrl+Cで中止）"
ELAPSED=0
NEW_DEPLOY=""

while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
    
    NEW_DEPLOY=$(get_latest_deployment)
    
    if [ "$NEW_DEPLOY" != "$CURRENT_DEPLOY" ]; then
        echo ""
        echo -e "${GREEN}✓ 新しいデプロイメント検出${NC}"
        echo "URL: $NEW_DEPLOY"
        echo "検出までの時間: ${ELAPSED}秒"
        break
    fi
    
    # 進捗表示（30秒ごと）
    if [ $((ELAPSED % 30)) -eq 0 ]; then
        echo "[$(date '+%H:%M:%S')] 待機中... ${ELAPSED}秒経過"
    else
        echo -n "."
    fi
done

if [ "$NEW_DEPLOY" = "$CURRENT_DEPLOY" ]; then
    echo ""
    echo -e "${RED}✗ タイムアウト: 新しいデプロイメントが検出されませんでした${NC}"
    echo "Gitプッシュが完了しているか確認してください"
    exit 1
fi

# デプロイメント完了を待機
echo ""
echo "デプロイメント完了を待機中..."
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(get_deployment_status "$NEW_DEPLOY")
    
    case "$STATUS" in
        "●"|"Ready")
            echo ""
            echo -e "${GREEN}✓ デプロイメント成功！${NC}"
            echo "URL: $NEW_DEPLOY"
            echo ""
            echo "=== ビルドサマリー ==="
            get_build_logs "$NEW_DEPLOY" | grep -E "(Build Completed|Generated|status)" | tail -5
            exit 0
            ;;
        "Error"|"●"*"Error"*)
            echo ""
            echo -e "${RED}✗ デプロイメント失敗${NC}"
            echo "URL: $NEW_DEPLOY"
            echo ""
            echo "=== エラーログ（最後の100行）==="
            get_build_logs "$NEW_DEPLOY" | tail -100
            exit 1
            ;;
        *)
            echo "[$(date '+%H:%M:%S')] 状態: ${STATUS:-ビルド中...}"
            ;;
    esac
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo -e "${YELLOW}⚠ タイムアウト: デプロイメント状態が確定しませんでした${NC}"
echo "手動で確認してください: $NEW_DEPLOY"
exit 1
