"use client";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary {...props} context="議事録機能" />;
}
