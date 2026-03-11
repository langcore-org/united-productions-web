/**
 * 環境変数チェックユーティリティ
 * Supabase認証に必要な環境変数の設定確認用
 */

export interface EnvStatus {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  info: Record<string, string>;
}

export function checkAuthEnv(): EnvStatus {
  const missing: string[] = [];
  const warnings: string[] = [];
  const info: Record<string, string> = {};

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    info.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (process.env.VERCEL_ENV) {
    info.VERCEL_ENV = process.env.VERCEL_ENV;
  }

  const siteUrl = getSiteUrl();
  info.SITE_URL = siteUrl;
  info.AUTH_CALLBACK_URL = `${siteUrl}/auth/callback`;

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    info,
  };
}

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

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
