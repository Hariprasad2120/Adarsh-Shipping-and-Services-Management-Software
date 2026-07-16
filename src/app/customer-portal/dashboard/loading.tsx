export default function CustomerPortalDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-outline-variant/50 bg-surface p-5 shadow-sm">
        <div className="h-3 w-32 rounded bg-surface-container-high animate-pulse" />
        <div className="mt-4 h-8 w-72 rounded bg-surface-container-high animate-pulse" />
        <div className="mt-3 h-4 w-full max-w-3xl rounded bg-surface-container-high animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card-top-accent rounded-[24px] border border-outline-variant/40 bg-surface p-5 shadow-sm">
            <div className="h-3 w-24 rounded bg-surface-container-high animate-pulse" />
            <div className="mt-4 h-9 w-20 rounded bg-surface-container-high animate-pulse" />
            <div className="mt-4 h-3 w-full rounded bg-surface-container-high animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-outline-variant/45 bg-surface p-5 shadow-sm">
              <div className="h-4 w-48 rounded bg-surface-container-high animate-pulse" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-12 rounded bg-surface-container-high animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6 xl:col-span-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-outline-variant/45 bg-surface p-5 shadow-sm">
              <div className="h-4 w-40 rounded bg-surface-container-high animate-pulse" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-10 rounded bg-surface-container-high animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
