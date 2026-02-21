#!/bin/bash
# LangChain移行確認スクリプト

echo "=== LangChain移行網羅的確認 ==="
echo ""

# 1. 旧実装の残存確認
echo "【1. 旧実装の残存確認】"
echo "---"
echo "lib/llm/clients/ の存在:"
if [ -d "lib/llm/clients" ]; then
  echo "  ❌ FAIL: lib/llm/clients/ が存在します"
  ls -la lib/llm/clients/
else
  echo "  ✅ PASS: lib/llm/clients/ は削除されています"
fi

echo ""
echo "lib/llm/archive/ の存在:"
if [ -d "lib/llm/archive" ]; then
  echo "  ❌ FAIL: lib/llm/archive/ が存在します"
else
  echo "  ✅ PASS: lib/llm/archive/ は削除されています"
fi

echo ""
echo "---"

# 2. LangChainディレクトリ構造
echo "【2. LangChainディレクトリ構造】"
echo "---"
find lib/llm/langchain -type f -name "*.ts" | sort
echo ""
echo "ファイル数: $(find lib/llm/langchain -type f -name "*.ts" | wc -l)"
echo ""
echo "---"

# 3. 旧インポートの残存確認
echo "【3. 旧インポートの残存確認】"
echo "---"
echo " '@/lib/llm/clients/' の参照:"
IMPORTS=$(grep -r "@/lib/llm/clients" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".next" || true)
if [ -z "$IMPORTS" ]; then
  echo "  ✅ PASS: 旧インポートは見つかりません"
else
  echo "  ❌ FAIL: 以下のファイルに旧インポートが残っています"
  echo "$IMPORTS"
fi

echo ""
echo " 'from.*clients/grok' の参照:"
GROK_IMPORTS=$(grep -r "from.*clients/grok" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".next" || true)
if [ -z "$GROK_IMPORTS" ]; then
  echo "  ✅ PASS: GrokClientインポートは見つかりません"
else
  echo "  ❌ FAIL: 以下のファイルにGrokClientインポートが残っています"
  echo "$GROK_IMPORTS"
fi

echo ""
echo "---"

# 4. LangChainインポートの確認
echo "【4. LangChainインポートの確認】"
echo "---"
echo " '@langchain/core' の使用:"
CORE_USAGE=$(grep -r "@langchain/core" --include="*.ts" lib/ 2>/dev/null | wc -l)
echo "  ファイル数: $CORE_USAGE"

echo ""
echo " '@langchain/openai' の使用:"
OPENAI_USAGE=$(grep -r "@langchain/openai" --include="*.ts" lib/ 2>/dev/null | wc -l)
echo "  ファイル数: $OPENAI_USAGE"

echo ""
echo " 'langchain' パッケージの使用:"
LANGCHAIN_USAGE=$(grep -r "from 'langchain" --include="*.ts" lib/ 2>/dev/null | wc -l)
echo "  ファイル数: $LANGCHAIN_USAGE"

echo ""
echo "---"

# 5. 主要ファイルの存在確認
echo "【5. 主要ファイルの存在確認】"
echo "---"
FILES=(
  "lib/llm/langchain/factory.ts"
  "lib/llm/langchain/adapter.ts"
  "lib/llm/langchain/chains/base.ts"
  "lib/llm/langchain/chains/streaming.ts"
  "lib/llm/langchain/types.ts"
  "lib/llm/langchain/config.ts"
  "lib/llm/index.ts"
  "lib/llm/factory.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (存在しません)"
  fi
done

echo ""
echo "---"

# 6. APIエンドポイント確認
echo "【6. APIエンドポイント確認】"
echo "---"
API_FILES=(
  "app/api/llm/chat/route.ts"
  "app/api/llm/stream/route.ts"
  "app/api/llm/rag/route.ts"
  "app/api/llm/langchain/route.ts"
  "app/api/llm/langchain/stream/route.ts"
)

for file in "${API_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (存在しません)"
  fi
done

echo ""
echo "=== 確認完了 ==="
