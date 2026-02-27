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

# 1. TypeScriptチェック
echo ""
echo -e "${YELLOW}[1/4] TypeScript型チェック...${NC}"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo -e "${RED}✗ TypeScriptエラーが見つかりました${NC}"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -10
    exit 1
else
    echo -e "${GREEN}✓ TypeScript OK${NC}"
fi

# 2. Lintチェック
echo ""
echo -e "${YELLOW}[2/4] Lintチェック...${NC}"
if npm run lint 2>&1 | grep -q "error"; then
    echo -e "${RED}✗ Lintエラーが見つかりました${NC}"
    npm run lint 2>&1 | grep "error" | head -10
    exit 1
else
    echo -e "${GREEN}✓ Lint OK${NC}"
fi

# 3. ビルドチェック
echo ""
echo -e "${YELLOW}[3/4] ビルドチェック...${NC}"
if ! npm run build 2>&1 > /tmp/build.log; then
    echo -e "${RED}✗ ビルド失敗${NC}"
    tail -50 /tmp/build.log
    exit 1
else
    echo -e "${GREEN}✓ ビルド OK${NC}"
fi

# 4. テストチェック（存在する場合）
echo ""
echo -e "${YELLOW}[4/4] テストチェック...${NC}"
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

echo ""
echo "========================================"
echo -e "${GREEN}全てのチェックが通過しました！${NC}"
echo "========================================"
