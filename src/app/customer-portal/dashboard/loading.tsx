import { CustomerPortalPage } from "@/components/monolith/customer-portal-workspace";

export default function CustomerPortalDashboardLoading() {
  return (
    <CustomerPortalPage aria-label="Loading customer dashboard">
      <div className="rounded-xl border border-mono-border/50 bg-mono-card p-5 shadow-sm">
        <div className="h-3 w-32 rounded bg-mono-soft animate-pulse" />
        <div className="mt-4 h-8 w-72 rounded bg-mono-soft animate-pulse" />
        <div className="mt-3 h-4 w-full max-w-3xl rounded bg-mono-soft animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="mnx-portal-panel rounded-xl border border-mono-border/40 bg-mono-card p-5 shadow-sm"
          >
            <div className="h-3 w-24 rounded bg-mono-soft animate-pulse" />
            <div className="mt-4 h-9 w-20 rounded bg-mono-soft animate-pulse" />
            <div className="mt-4 h-3 w-full rounded bg-mono-soft animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-mono-border/45 bg-mono-card p-5 shadow-sm"
            >
              <div className="h-4 w-48 rounded bg-mono-soft animate-pulse" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="h-12 rounded bg-mono-soft animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6 xl:col-span-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-mono-border/45 bg-mono-card p-5 shadow-sm"
            >
              <div className="h-4 w-40 rounded bg-mono-soft animate-pulse" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="h-10 rounded bg-mono-soft animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerPortalPage>
  );
}
