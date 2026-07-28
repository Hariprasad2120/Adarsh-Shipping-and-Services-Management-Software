export default function CustomerPortalShipmentsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-mono-border/50 bg-mono-card p-5 shadow-sm">
        <div className="h-3 w-36 animate-pulse rounded bg-mono-soft" />
        <div className="mt-4 h-8 w-72 animate-pulse rounded bg-mono-soft" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-mono-soft" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="monolith-card monolith-accent rounded-xl border border-mono-border/40 bg-mono-card p-5 shadow-sm">
            <div className="h-3 w-24 animate-pulse rounded bg-mono-soft" />
            <div className="mt-4 h-9 w-20 animate-pulse rounded bg-mono-soft" />
            <div className="mt-4 h-3 w-full animate-pulse rounded bg-mono-soft" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-mono-border/45 bg-mono-card p-5 shadow-sm">
        <div className="h-4 w-48 animate-pulse rounded bg-mono-soft" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl bg-mono-soft" />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-mono-border/45 bg-mono-card p-5 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-mono-soft" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-mono-soft" />
          ))}
        </div>
      </div>
    </div>
  );
}
