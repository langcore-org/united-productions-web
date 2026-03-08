#!/bin/bash

# ステージングされたファイルを確認し、別作業のファイルが含まれていないかチェックするスクリプト

echo "========================================"
echo "ステージングされたファイル確認"
echo "========================================"
echo ""

# ステージングされたファイル一覧
echo "【ステージングされたファイル】"
git diff --cached --name-only | while read file; do
    echo "  - $file"
done

echo ""
echo "【ファイル数】"
STAGED_COUNT=$(git diff --cached --name-only | wc -l)
echo "  合計: $STAGED_COUNT ファイル"

echo ""
echo "========================================"
echo "確認項目"
echo "========================================"

# よく別作業に含まれやすいディレクトリ/パターンをチェック
echo ""
echo "以下のファイルが含まれていないか確認："
echo ""

# docs/
DOCS_FILES=$(git diff --cached --name-only | grep "^docs/" || true)
if [ -n "$DOCS_FILES" ]; then
    echo "⚠️  docs/ （ドキュメント）:"
    echo "$DOCS_FILES" | sed 's/^/    /'
    echo ""
fi

# .claude/skills/
SKILL_FILES=$(git diff --cached --name-only | grep "^\.claude/skills/" || true)
if [ -n "$SKILL_FILES" ]; then
    echo "⚠️  .claude/skills/ （スキルファイル）:"
    echo "$SKILL_FILES" | sed 's/^/    /'
    echo ""
fi

# scripts/
SCRIPT_FILES=$(git diff --cached --name-only | grep "^scripts/" || true)
if [ -n "$SCRIPT_FILES" ]; then
    echo "⚠️  scripts/ （調査スクリプト）:"
    echo "$SCRIPT_FILES" | sed 's/^/    /'
    echo ""
fi

# *.md
MD_FILES=$(git diff --cached --name-only | grep "\.md$" || true)
if [ -n "$MD_FILES" ]; then
    echo "⚠️  *.md （マークダウン）:"
    echo "$MD_FILES" | sed 's/^/    /'
    echo ""
fi

# 新規追加ファイル
NEW_FILES=$(git diff --cached --name-only --diff-filter=A || true)
if [ -n "$NEW_FILES" ]; then
    echo "📄 新規追加ファイル:"
    echo "$NEW_FILES" | sed 's/^/    /'
    echo ""
fi

echo ""
echo "========================================"
echo "操作"
echo "========================================"
echo ""
echo "【ステージング解除】"
echo "  git reset HEAD <ファイル名>"
echo ""
echo "【対話的にステージング】"
echo "  git add -p"
echo ""
echo "【差分確認】"
echo "  git diff --cached <ファイル名>"
echo ""
echo "【コミット（確認済みの場合）】"
echo "  git commit -m \"fix: ...\" --no-verify"
echo ""
