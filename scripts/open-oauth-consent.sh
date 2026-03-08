#!/bin/bash
# OAuth 同意画面をブラウザで開くヘルパースクリプト
# テストユーザーの追加は手動で行う必要があります（GoogleはAPI/CLIを提供していません）

set -e

BASE_URL="https://console.cloud.google.com/apis/credentials/consent"
PROJECT_ID="${1:-}"

if [ -n "$PROJECT_ID" ]; then
  URL="${BASE_URL}?project=${PROJECT_ID}"
  echo "Opening OAuth consent screen for project: $PROJECT_ID"
else
  URL="$BASE_URL"
  echo "Opening OAuth consent screen (current project)"
  echo "Tip: Pass project ID as argument to open specific project: $0 YOUR_PROJECT_ID"
fi

# ブラウザで開く（OSに応じて）
if command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
elif command -v open &>/dev/null; then
  open "$URL"
else
  echo "Could not detect browser launcher. Open this URL manually:"
  echo "$URL"
fi
