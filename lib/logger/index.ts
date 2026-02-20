/**
 * アプリケーションロガー
 * 
 * 統一的なログ記録を提供します。
 * ログレベル: DEBUG, INFO, WARN, ERROR, AUDIT
 * カテゴリ: AUTH, API, DB, SYSTEM, USER_ACTION, SECURITY, PERFORMANCE
 */

import { prisma } from "@/lib/prisma";
import type { LogLevel, LogCategory } from "@prisma/client";

interface LogContext {
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
}

interface LogData {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  context?: LogContext;
  error?: Error;
}

// 環境変数でログレベルを制御
const MIN_LOG_LEVEL: Record<string, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  AUDIT: 4,
};

const CURRENT_MIN_LEVEL = process.env.LOG_LEVEL || "INFO";

/**
 * ログを記録
 */
export async function log(data: LogData): Promise<void> {
  // ログレベルでフィルタリング
  if (MIN_LOG_LEVEL[data.level] < MIN_LOG_LEVEL[CURRENT_MIN_LEVEL]) {
    return;
  }

  try {
    const { level, category, message, details, userId, context, error } = data;

    // コンソールにも出力
    const consoleMessage = `[${level}] [${category}] ${message}`;
    switch (level) {
      case "DEBUG":
        console.debug(consoleMessage, details);
        break;
      case "INFO":
      case "AUDIT":
        console.info(consoleMessage);
        break;
      case "WARN":
        console.warn(consoleMessage);
        break;
      case "ERROR":
        console.error(consoleMessage, error);
        break;
    }

    // データベースに記録（非同期で実行）
    prisma.appLog.create({
      data: {
        level,
        category,
        message,
        details: details as any || {},
        userId,
        requestId: context?.requestId,
        path: context?.path,
        method: context?.method,
        ip: context?.ip,
        userAgent: context?.userAgent,
        duration: context?.duration,
        errorCode: error?.name,
        stackTrace: error?.stack,
      },
    }).catch((err) => {
      // DBへの記録失敗は無視（コンソールには出力済み）
      console.error("Failed to save log to database:", err);
    });
  } catch (err) {
    console.error("Logger error:", err);
  }
}

// 便利なショートハンド関数
export const logger = {
  debug: (category: LogCategory, message: string, details?: Record<string, unknown>) =>
    log({ level: "DEBUG", category, message, details }),
  
  info: (category: LogCategory, message: string, details?: Record<string, unknown>) =>
    log({ level: "INFO", category, message, details }),
  
  warn: (category: LogCategory, message: string, details?: Record<string, unknown>) =>
    log({ level: "WARN", category, message, details }),
  
  error: (category: LogCategory, message: string, error?: Error, details?: Record<string, unknown>) =>
    log({ level: "ERROR", category, message, error, details }),
  
  audit: (message: string, userId: string, details?: Record<string, unknown>, context?: LogContext) =>
    log({ level: "AUDIT", category: "USER_ACTION", message, userId, details, context }),
};

/**
 * リクエストコンテキストを作成
 */
export function createLogContext(request: Request): LogContext {
  return {
    path: new URL(request.url).pathname,
    method: request.method,
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

/**
 * エラーログを記録
 */
export async function logError(
  category: LogCategory,
  message: string,
  error: Error,
  context?: LogContext,
  userId?: string
): Promise<void> {
  await log({
    level: "ERROR",
    category,
    message,
    error,
    context,
    userId,
  });
}

/**
 * API呼び出しログを記録
 */
export async function logApiCall(
  path: string,
  method: string,
  duration: number,
  userId?: string,
  statusCode?: number
): Promise<void> {
  const category: LogCategory = statusCode && statusCode >= 400 ? "API" : "PERFORMANCE";
  const level: LogLevel = statusCode && statusCode >= 500 ? "ERROR" : "INFO";
  
  await log({
    level,
    category,
    message: `${method} ${path} - ${statusCode || "OK"} (${duration}ms)`,
    details: { statusCode, duration },
    userId,
    context: { path, method, duration },
  });
}

/**
 * 認証ログを記録
 */
export async function logAuth(
  action: "login" | "logout" | "signup" | "failed",
  userId: string,
  email?: string,
  ip?: string
): Promise<void> {
  const messages: Record<string, string> = {
    login: "User logged in",
    logout: "User logged out",
    signup: "User signed up",
    failed: "Authentication failed",
  };

  await log({
    level: action === "failed" ? "WARN" : "AUDIT",
    category: "AUTH",
    message: messages[action],
    userId,
    details: { action, email },
    context: { ip },
  });
}
