#!/bin/bash

# CIエラーをローカルで再現するスクリプト

set -e

echo "========================================"
echo "CIチェックをローカルで実行"
echo "========================================"

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 0. 依存関係チェック
echo ""
echo -e "${YELLOW}[0/5] 依存関係チェック...${NC}"

# Prismaのスキーマがあればクライアントを再生成
if [ -f "prisma/schema.prisma" ]; then
  echo "  Prismaスキーマを検出。クライアントを再生成します..."
  npx prisma generate > /dev/null 2>&1
  echo -e "${GREEN}  ✓ Prisma Client生成完了${NC}"
else
  echo "  Prismaスキーマなし。スキップ。"
fi

# 1. TypeScriptチェック
echo ""
echo -e "${YELLOW}[1/5] TypeScript型チェック...${NC}"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo -e "${RED}✗ TypeScriptエラーが見つかりました${NC}"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -10
    exit 1
else
    echo -e "${GREEN}✓ TypeScript OK${NC}"
fi

# 2. Lintチェック
echo ""
echo -e "${YELLOW}[2/5] Lintチェック...${NC}"
if npm run lint 2>&1 | grep -q "error"; then
    echo -e "${RED}✗ Lintエラーが見つかりました${NC}"
    npm run lint 2>&1 | grep "error" | head -10
    exit 1
else
    echo -e "${GREEN}✓ Lint OK${NC}"
fi

# 3. ビルドチェック
echo ""
echo -e "${YELLOW}[3/5] ビルドチェック...${NC}"
if ! npm run build 2>&1 > /tmp/build.log; then
    echo -e "${RED}✗ ビルド失敗${NC}"
    tail -50 /tmp/build.log
    exit 1
else
    echo -e "${GREEN}✓ ビルド OK${NC}"
fi

# 4. テストチェック（存在する場合）
echo ""
echo -e "${YELLOW}[4/5] テストチェック...${NC}"
if [ -f "vitest.config.ts" ] || [ -f "jest.config.js" ]; then
    if ! npm test 2>&1 > /tmp/test.log; then
        echo -e "${RED}✗ テスト失敗${NC}"
        tail -50 /tmp/test.log
        exit 1
    else
        echo -e "${GREEN}✓ テスト OK${NC}"
    fi
else
    echo -e "${YELLOW}⚠ テスト設定が見つかりません（スキップ）${NC}"
fi

# 5. ステージングされたファイルの確認
echo ""
echo -e "${YELLOW}[5/5] ステージングされたファイル確認...${NC}"
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")
if [ -n "$STAGED_FILES" ]; then
    echo "  ステージングされたファイル："
    echo "$STAGED_FILES" | head -10
    echo ""
    echo -e "${YELLOW}  ⚠ コミット前に別作業のファイルが含まれていないか確認してください${NC}"
else
    echo "  ステージングされたファイルなし"
fi

echo ""
echo "========================================"
echo -e "${GREEN}全てのチェックが通過しました！${NC}"
echo "========================================"
echo ""
echo "コミット前の確認："
echo "  git diff --cached --stat  # ステージングされたファイルを確認"
echo "  git diff --cached --name-only  # ファイル名のみ表示"
