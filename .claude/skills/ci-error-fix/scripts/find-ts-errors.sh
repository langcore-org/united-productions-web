#!/bin/bash

# TypeScriptエラーの場所を特定するスクリプト

echo "========================================"
echo "TypeScriptエラー分析"
echo "========================================"

echo ""
echo "【エラー一覧】"
echo "----------------------------------------"
npx tsc --noEmit 2>&1 | grep "error TS" | head -20

echo ""
echo "【エラーが出ているファイル】"
echo "----------------------------------------"
npx tsc --noEmit 2>&1 | grep "error TS" | awk -F'(' '{print $1}' | sort | uniq -c | sort -rn

echo ""
echo "【エラーの種類】"
echo "----------------------------------------"
npx tsc --noEmit 2>&1 | grep "error TS" | sed 's/.*error TS[0-9]*://' | sort | uniq -c | sort -rn | head -10

echo ""
echo "【詳細なエラーメッセージ（先頭10件）】"
echo "----------------------------------------"
npx tsc --noEmit 2>&1 | grep -A2 "error TS" | head -30
