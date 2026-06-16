function LoadingLine({ width }: { width: string }) {
  return <div className={`h-3 rounded-full bg-surface-container-high ${width}`} />;
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface p-6 shadow-ambient">
      <div className="mb-4 h-5 w-32 rounded-full bg-surface-container-high" />
      <div className="space-y-3">
        <LoadingLine width="w-full" />
        <LoadingLine width="w-5/6" />
        <LoadingLine width="w-2/3" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 w-56 rounded-full bg-surface-container-high" />
        <div className="h-4 w-80 max-w-full rounded-full bg-surface-container" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>

      <div className="rounded-2xl border border-outline-variant/40 bg-surface p-6 shadow-ambient">
        <div className="mb-6 h-5 w-40 rounded-full bg-surface-container-high" />
        <div className="space-y-4">
          <LoadingLine width="w-full" />
          <LoadingLine width="w-11/12" />
          <LoadingLine width="w-10/12" />
          <LoadingLine width="w-9/12" />
        </div>
      </div>
    </div>
  );
}
