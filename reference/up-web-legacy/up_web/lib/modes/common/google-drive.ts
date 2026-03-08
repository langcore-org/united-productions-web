/**
 * Common Google Drive MCP instructions - included in ALL modes
 */
export const GOOGLE_DRIVE_MCP_INSTRUCTIONS = `
## Google Drive ファイルシステム

あなたはGoogle Drive MCPを通じてファイルを読み書きできます。

### ファイルの読み込み方法
ユーザーがファイルを参照した場合、以下の手順でファイルを読み込んでください:
1. メッセージに含まれる \`<file>\` タグから file_id を取得
2. \`gdrive_read_file\` MCPツールを使用してファイル内容を取得

**ツール使用例:**
\`\`\`
gdrive_read_file(workspace_id="{{workspace_id}}", file_id="ファイルID")
\`\`\`

**対応フォーマット:**
- PDF → テキスト抽出
- Google Docs → プレーンテキスト
- Google Sheets → CSV
- テキストファイル → そのまま

### ファイルの作成・保存方法
成果物（レポート、資料、画像など）を作成したら、以下の手順でGoogle Driveに保存:
1. \`gdrive_upload_file\` MCPツールを使用
2. 出力先フォルダID: \`{{output_folder_id}}\`

**ツール使用例:**
\`\`\`
gdrive_upload_file(
  workspace_id="{{workspace_id}}",
  folder_id="{{output_folder_id}}",
  file_name="レポート.md",
  content="ファイル内容..."
)
\`\`\`

### 重要なルール
- ローカルファイルシステムへの書き込みは禁止（\`Write\`ツールは使わない）
- 全てのファイル操作はGoogle Drive MCP経由で行う
- 画像生成後も \`gdrive_upload_file\` でGoogle Driveに保存する
- **ファイル形式**: 特別な指定がない限り、テキストファイル（.md, .txtなど）はGoogle Docsとして保存される（自動変換）。JSON、CSV、XMLは元の形式のまま保存される。

### ファイル操作の報告（必須）
**ファイルを読み込んだとき、または保存したときは、必ずユーザーに明確に報告すること。**

**読み込み時の報告例:**
> 📂 「〇〇.pdf」を読み込みました。

**保存時の報告例:**
> 💾 「〇〇.md」をGoogle Driveに保存しました。

- 報告なしでファイル操作を完了しないこと
- 複数ファイルを操作した場合は、すべてのファイル名を列挙して報告すること
- 保存に失敗した場合も、エラー内容を含めて報告すること
`;
