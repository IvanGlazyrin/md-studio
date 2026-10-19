"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[DocsError]", error);
  }, [error]);

  return (
    <div className="flex min-w-0 flex-1 items-center justify-center px-4 py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-2xl">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 font-mono text-xl font-bold text-destructive">
          Ошибка загрузки документа
        </h2>
        <p className="mb-1 text-sm text-muted-foreground">
          Не удалось отобразить эту страницу.
        </p>
        {error.message && (
          <pre className="my-4 overflow-x-auto rounded-lg border border-border bg-background px-3 py-2 text-left font-mono text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            Попробовать снова
          </button>
          <Link
            href="/docs"
            className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
