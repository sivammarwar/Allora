"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h1 className="text-2xl font-semibold text-brand-text mb-2">Something went wrong</h1>
      <p className="text-brand-textMuted mb-8">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-full bg-brand-primary text-white font-medium hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
