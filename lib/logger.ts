/**
 * ロガーユーティリティ
 * 
 * 環境に応じたログレベル制御と構造化ログ出力
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private static instance: Logger;
  private level: LogLevel;

  private constructor() {
    // 環境変数からログレベルを取得（デフォルト: info）
    const envLevel = process.env.LOG_LEVEL as LogLevel;
    this.level = envLevel || 'info';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }
}

export const logger = Logger.getInstance();

/**
 * クライアントサイド用ロガー
 */
export function createClientLogger(scope: string) {
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    debug: (message: string, data?: unknown) => {
      if (isDev) {
        console.log(`[${scope}] [DEBUG]`, message, data ?? '');
      }
    },
    info: (message: string, data?: unknown) => {
      console.log(`[${scope}] [INFO]`, message, data ?? '');
    },
    warn: (message: string, data?: unknown) => {
      console.warn(`[${scope}] [WARN]`, message, data ?? '');
    },
    error: (message: string, error?: unknown) => {
      console.error(`[${scope}] [ERROR]`, message, error ?? '');
    },
  };
}
