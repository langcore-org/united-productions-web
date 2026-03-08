#!/bin/bash
# Vercel 環境変数設定スクリプト
# 使用方法: ./scripts/setup-vercel-env.sh

echo "==============================================="
echo "Vercel 環境変数設定支援スクリプト"
echo "==============================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 現在の値を表示
echo -e "${YELLOW}現在の .env.local から値を読み込みます...${NC}"
echo ""

# 値の読み取り
if [ -f .env.local ]; then
    GOOGLE_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" .env.local | cut -d'=' -f2 | tr -d '"')
    GOOGLE_CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" .env.local | cut -d'=' -f2 | tr -d '"')
    NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" .env.local | cut -d'=' -f2 | tr -d '"')
else
    echo -e "${RED}.env.local ファイルが見つかりません${NC}"
    exit 1
fi

# Vercel CLIの確認
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Vercel CLIがインストールされていません${NC}"
    echo "インストール: npm i -g vercel"
    exit 1
fi

echo "読み込まれた値:"
echo "  GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:20}..."
echo "  NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:20}..."
echo ""

# プロジェクト名の確認
echo -n "Vercelプロジェクト名を入力してください (例: ai-hub): "
read PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}プロジェクト名は必須です${NC}"
    exit 1
fi

echo ""
echo "==============================================="
echo "本番環境 (Production) の設定"
echo "==============================================="
echo ""

echo -n "本番環境のドメインを入力してください (例: ai-hub.vercel.app): "
read PRODUCTION_DOMAIN

if [ -z "$PRODUCTION_DOMAIN" ]; then
    PRODUCTION_DOMAIN="$PROJECT_NAME.vercel.app"
    echo "デフォルト値を使用: $PRODUCTION_DOMAIN"
fi

echo ""
echo "以下のコマンドを実行して本番環境の環境変数を設定します:"
echo ""
echo -e "${GREEN}vercel env add NEXTAUTH_URL production${NC}"
echo "  値: https://$PRODUCTION_DOMAIN"
echo ""
echo -e "${GREEN}vercel env add NEXTAUTH_SECRET production${NC}"
echo "  値: $NEXTAUTH_SECRET"
echo ""
echo -e "${GREEN}vercel env add GOOGLE_CLIENT_ID production${NC}"
echo "  値: $GOOGLE_CLIENT_ID"
echo ""
echo -e "${GREEN}vercel env add GOOGLE_CLIENT_SECRET production${NC}"
echo "  値: $GOOGLE_CLIENT_SECRET"
echo ""

echo "==============================================="
echo "プレビュー環境 (Preview) の設定"
echo "==============================================="
echo ""
echo "プレビュー環境では NEXTAUTH_URL は自動的に設定されます"
echo ""
echo "以下のコマンドを実行してください:"
echo ""
echo -e "${GREEN}vercel env add AUTH_TRUST_HOST preview${NC}"
echo "  値: true"
echo ""
echo -e "${GREEN}vercel env add NEXTAUTH_SECRET preview${NC}"
echo "  値: $NEXTAUTH_SECRET"
echo ""
echo -e "${GREEN}vercel env add GOOGLE_CLIENT_ID preview${NC}"
echo "  値: $GOOGLE_CLIENT_ID"
echo ""
echo -e "${GREEN}vercel env add GOOGLE_CLIENT_SECRET preview${NC}"
echo "  値: $GOOGLE_CLIENT_SECRET"
echo ""

echo "==============================================="
echo "Google Cloud Console での設定"
echo "==============================================="
echo ""
echo "以下のURLを Google Cloud Console → APIとサービス → 認証情報 → OAuth 2.0 クライアントID に追加してください:"
echo ""
echo -e "${YELLOW}承認済みリダイレクトURI:${NC}"
echo "  https://$PRODUCTION_DOMAIN/api/auth/callback/google"
echo ""
echo -e "${YELLOW}プレビュー環境用（必要に応じて個別に追加）:${NC}"
echo "  https://$PROJECT_NAME-git-[branch-name].vercel.app/api/auth/callback/google"
echo ""
echo -e "${RED}注意: Google OAuthはワイルドカードをサポートしていません${NC}"
echo "各プレビュー環境のURLを個別に追加する必要があります"
echo ""

echo "==============================================="
echo "次のステップ"
echo "==============================================="
echo ""
echo "1. 上記のVercel CLIコマンドを実行して環境変数を設定"
echo "2. Google Cloud ConsoleでリダイレクトURIを追加"
echo "3. アプリケーションを再デプロイ"
echo ""
echo "プレビュー環境で認証をテスト:"
echo "  1. ブランチをプッシュしてプレビューデプロイを作成"
echo "  2. プレビューURLにアクセス"
echo "  3. Google認証を実行"
echo ""
