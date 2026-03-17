import { useEffect, useRef, useState } from "react";

/**
 * 値の更新頻度を間引くためのフック。
 * ストリーミング中のMarkdownレンダリングなど、高頻度更新時の負荷軽減に使用する。
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState<T>(value);
  const latestValueRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最新値を常に保持
  useEffect(() => {
    latestValueRef.current = value;

    // まだタイマーが動いていない場合はすぐにスケジュール
    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setThrottled(latestValueRef.current);
      }, intervalMs);
    }

    return () => {
      // アンマウント時はタイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, intervalMs]);

  return throttled;
}
