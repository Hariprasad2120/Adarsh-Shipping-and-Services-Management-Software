export default function CustomerPortalShipmentDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-outline-variant/50 bg-surface p-5 shadow-sm">
        <div className="h-8 w-36 animate-pulse rounded bg-surface-container-high" />
        <div className="mt-4 h-8 w-56 animate-pulse rounded bg-surface-container-high" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-surface-container-high" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-outline-variant/45 bg-surface p-5 shadow-sm">
              <div className="h-4 w-48 animate-pulse rounded bg-surface-container-high" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-12 animate-pulse rounded bg-surface-container-high" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6 xl:col-span-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-outline-variant/45 bg-surface p-5 shadow-sm">
              <div className="h-4 w-40 animate-pulse rounded bg-surface-container-high" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-10 animate-pulse rounded bg-surface-container-high" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
