/**
 * タイピングアニメーションフック
 *
 * 文字を1文字ずつ表示するアニメーション
 *
 * @updated 2026-02-20 23:25
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseTypingAnimationOptions {
  /** 文字表示間隔（ミリ秒） */
  typingSpeed?: number;
  /** 単語区切りで表示するか */
  wordByWord?: boolean;
  /** 自動開始するか */
  autoStart?: boolean;
}

export interface UseTypingAnimationReturn {
  /** 表示中のテキスト */
  displayText: string;
  /** 完了したか */
  isComplete: boolean;
  /** 進捗（0-100） */
  progress: number;
  /** アニメーション開始 */
  start: (text: string) => void;
  /** アニメーション停止 */
  stop: () => void;
  /** 即座に全表示 */
  complete: () => void;
  /** リセット */
  reset: () => void;
}

/**
 * タイピングアニメーションフック
 *
 * @example
 * ```typescript
 * const { displayText, isComplete, start } = useTypingAnimation({
 *   typingSpeed: 30,
 *   wordByWord: false,
 * });
 *
 * useEffect(() => {
 *   start("こんにちは、世界！");
 * }, []);
 * ```
 */
export function useTypingAnimation(
  options: UseTypingAnimationOptions = {},
): UseTypingAnimationReturn {
  const { typingSpeed = 30, wordByWord = false, autoStart = false } = options;

  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [targetText, setTargetText] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const currentIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const clearTyping = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    clearTyping();
    setDisplayText("");
    setIsComplete(false);
    setTargetText("");
    setIsRunning(false);
    currentIndexRef.current = 0;
  }, [clearTyping]);

  const complete = useCallback(() => {
    clearTyping();
    setDisplayText(targetText);
    setIsComplete(true);
    setIsRunning(false);
    currentIndexRef.current = targetText.length;
  }, [clearTyping, targetText]);

  const stop = useCallback(() => {
    clearTyping();
    setIsRunning(false);
  }, [clearTyping]);

  const tick = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= typingSpeed) {
        lastTimeRef.current = timestamp;

        if (currentIndexRef.current >= targetText.length) {
          setIsComplete(true);
          setIsRunning(false);
          return;
        }

        if (wordByWord) {
          // 単語区切りで表示
          const remaining = targetText.slice(currentIndexRef.current);
          const nextSpaceIndex = remaining.search(/\s/);
          const chunkLength = nextSpaceIndex === -1 ? remaining.length : nextSpaceIndex + 1;
          const nextIndex = currentIndexRef.current + chunkLength;

          setDisplayText(targetText.slice(0, nextIndex));
          currentIndexRef.current = nextIndex;
        } else {
          // 1文字ずつ表示
          const nextIndex = currentIndexRef.current + 1;
          setDisplayText(targetText.slice(0, nextIndex));
          currentIndexRef.current = nextIndex;
        }

        if (currentIndexRef.current >= targetText.length) {
          setIsComplete(true);
          setIsRunning(false);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [targetText, typingSpeed, wordByWord],
  );

  const start = useCallback(
    (text: string) => {
      reset();
      setTargetText(text);
      setIsRunning(true);

      if (text.length > 0) {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsComplete(true);
        setIsRunning(false);
      }
    },
    [reset, tick],
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      clearTyping();
    };
  }, [clearTyping]);

  // ターゲットテキスト変更時の処理
  useEffect(() => {
    if (autoStart && targetText && !isComplete && displayText === "" && !isRunning) {
      setIsRunning(true);
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [autoStart, targetText, isComplete, displayText, isRunning, tick]);

  const progress =
    targetText.length > 0 ? Math.round((currentIndexRef.current / targetText.length) * 100) : 0;

  return {
    displayText,
    isComplete,
    progress,
    start,
    stop,
    complete,
    reset,
  };
}

/**
 * 複数テキストの連続タイピングアニメーションフック
 *
 * 複数の段落を順番に表示する場合に使用
 */
export interface UseSequentialTypingOptions {
  /** 段落間の待機時間（ミリ秒） */
  paragraphDelay?: number;
  /** 文字表示間隔（ミリ秒） */
  typingSpeed?: number;
}

export interface UseSequentialTypingReturn {
  /** 表示中のテキスト配列 */
  displayTexts: string[];
  /** 現在タイピング中の段落インデックス */
  currentIndex: number;
  /** 全段落完了したか */
  isAllComplete: boolean;
  /** アニメーション開始 */
  start: (texts: string[]) => void;
  /** 全て即座に表示 */
  completeAll: () => void;
  /** リセット */
  reset: () => void;
}

export function useSequentialTyping(
  options: UseSequentialTypingOptions = {},
): UseSequentialTypingReturn {
  const { paragraphDelay = 300, typingSpeed = 30 } = options;

  const [displayTexts, setDisplayTexts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAllComplete, setIsAllComplete] = useState(false);
  const [targetTexts, setTargetTexts] = useState<string[]>([]);
  const [_isRunning, setIsRunning] = useState(false);

  const rafRef = useRef<number | null>(null);
  const charIndexRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const delayStartRef = useRef<number>(0);
  const isDelayingRef = useRef(false);

  const clearAll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = 0;
    delayStartRef.current = 0;
    isDelayingRef.current = false;
  }, []);

  const reset = useCallback(() => {
    clearAll();
    setDisplayTexts([]);
    setCurrentIndex(0);
    setIsAllComplete(false);
    setTargetTexts([]);
    setIsRunning(false);
    charIndexRef.current = 0;
  }, [clearAll]);

  const completeAll = useCallback(() => {
    clearAll();
    setDisplayTexts(targetTexts);
    setCurrentIndex(targetTexts.length);
    setIsAllComplete(true);
    setIsRunning(false);
  }, [clearAll, targetTexts]);

  const tick = useCallback(
    (timestamp: number) => {
      // 遅延中
      if (isDelayingRef.current) {
        if (timestamp - delayStartRef.current < paragraphDelay) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        isDelayingRef.current = false;
        lastTimeRef.current = timestamp;
      }

      if (currentIndex >= targetTexts.length) {
        setIsAllComplete(true);
        setIsRunning(false);
        return;
      }

      const currentText = targetTexts[currentIndex];

      if (charIndexRef.current >= currentText.length) {
        // 現在の段落完了、次へ
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        charIndexRef.current = 0;

        if (nextIndex < targetTexts.length) {
          // 段落間の遅延
          isDelayingRef.current = true;
          delayStartRef.current = timestamp;
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setIsAllComplete(true);
          setIsRunning(false);
        }
        return;
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= typingSpeed) {
        lastTimeRef.current = timestamp;
        // 次の文字を表示
        charIndexRef.current += 1;
        setDisplayTexts((prev) => {
          const newTexts = [...prev];
          newTexts[currentIndex] = currentText.slice(0, charIndexRef.current);
          return newTexts;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [currentIndex, targetTexts, paragraphDelay, typingSpeed],
  );

  const start = useCallback(
    (texts: string[]) => {
      reset();
      setTargetTexts(texts);
      setDisplayTexts(texts.map(() => ""));
      setIsRunning(true);

      if (texts.length > 0 && texts[0].length > 0) {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsAllComplete(true);
        setIsRunning(false);
      }
    },
    [reset, tick],
  );

  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  return {
    displayTexts,
    currentIndex,
    isAllComplete,
    start,
    completeAll,
    reset,
  };
}
