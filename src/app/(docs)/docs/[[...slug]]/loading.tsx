export default function DocsLoading() {
  return (
    <div className="flex min-w-0 flex-1 animate-pulse">
      {/* Content skeleton */}
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
        <div className="mx-auto w-full max-w-[52rem] space-y-4">
          {/* Title */}
          <div className="mb-8 h-10 w-3/5 rounded-lg bg-muted/40" />
          {/* Body paragraphs */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted/30" style={{ width: `${75 + (i % 3) * 8}%` }} />
            ))}
          </div>
          <div className="mt-8 h-6 w-40 rounded bg-muted/40" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted/30" style={{ width: `${65 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </div>
      </main>

      {/* TOC skeleton */}
      <nav className="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] w-56 shrink-0 p-4 xl:block">
        <div className="mb-3 h-3 w-24 rounded bg-muted/40" />
        <div className="space-y-2 border-l border-border pl-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-muted/30" style={{ width: `${50 + (i % 4) * 12}%` }} />
          ))}
        </div>
      </nav>
    </div>
  );
}
