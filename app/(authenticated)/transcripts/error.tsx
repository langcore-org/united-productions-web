"use client";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";

export default function ErrorPage(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundary {...props} context="文字起こし機能" />;
}
