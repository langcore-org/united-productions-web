/**
 * 環境変数チェックユーティリティ
 * Vercel各環境での設定確認用
 */

export interface EnvStatus {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  info: Record<string, string>;
}

/**
 * 認証に必要な環境変数をチェック
 */
export function checkAuthEnv(): EnvStatus {
  const missing: string[] = [];
  const warnings: string[] = [];
  const info: Record<string, string> = {};

  // 必須環境変数
  const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // NEXTAUTH_URLのチェック
  const nextAuthUrl = getNextAuthUrl();
  info.NEXTAUTH_URL = nextAuthUrl;

  if (!process.env.NEXTAUTH_URL) {
    if (process.env.VERCEL_URL) {
      info.NEXTAUTH_URL_SOURCE = "VERCEL_URL (自動設定)";
    } else {
      warnings.push("NEXTAUTH_URLが明示的に設定されていません（フォールバック: localhost:3000）");
    }
  }

  // Vercel環境の確認
  if (process.env.VERCEL_ENV) {
    info.VERCEL_ENV = process.env.VERCEL_ENV;

    if (process.env.VERCEL_ENV === "preview" && !process.env.AUTH_TRUST_HOST) {
      warnings.push("プレビュー環境で AUTH_TRUST_HOST=true の設定を推奨");
    }
  }

  // Google Cloud Console設定のヒント
  const callbackUrl = `${nextAuthUrl}/api/auth/callback/google`;
  info.GOOGLE_CALLBACK_URL = callbackUrl;

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    info,
  };
}

/**
 * 現在のホストURLを取得
 */
function getNextAuthUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

/**
 * 環境状態の文字列表現を取得（デバッグ用）
 */
export function getEnvDebugInfo(): string {
  const status = checkAuthEnv();

  const lines = [
    "=== 環境変数チェック ===",
    `有効性: ${status.isValid ? "✅ OK" : "❌ 問題あり"}`,
    "",
    "【情報】",
    ...Object.entries(status.info).map(([k, v]) => `  ${k}: ${v}`),
  ];

  if (status.missing.length > 0) {
    lines.push("", "【不足している変数】");
    lines.push(...status.missing.map((m) => `  ❌ ${m}`));
  }

  if (status.warnings.length > 0) {
    lines.push("", "【警告】");
    lines.push(...status.warnings.map((w) => `  ⚠️  ${w}`));
  }

  return lines.join("\n");
}
