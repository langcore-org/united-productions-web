import { useEffect, useRef, useState } from "react";

/**
 * 値の更新頻度を間引くためのフック。
 * ストリーミング中のMarkdownレンダリングなど、高頻度更新時の負荷軽減に使用する。
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState<T>(value);
  const latestValueRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最新値を保持しつつ、一定間隔でのみ state に反映する
  useEffect(() => {
    latestValueRef.current = value;

    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setThrottled(latestValueRef.current);
      }, intervalMs);
    }
  }, [value, intervalMs]);

  // アンマウント時のみタイマーを破棄する
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return throttled;
}
