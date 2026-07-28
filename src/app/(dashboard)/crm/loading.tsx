function LoadingLine({ width }: { width: string }) {
  return <div className={`h-3 rounded-full bg-mono-soft ${width}`} />;
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-mono-border/30">
      <div className="h-9 w-9 rounded-full bg-mono-soft shrink-0" />
      <div className="flex-1 space-y-2">
        <LoadingLine width="w-40" />
        <LoadingLine width="w-24" />
      </div>
      <LoadingLine width="w-20" />
      <LoadingLine width="w-16" />
      <LoadingLine width="w-16" />
    </div>
  );
}

export default function CrmLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between border-b border-mono-border/30 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-full bg-mono-soft" />
          <div className="h-4 w-72 rounded-full bg-mono-soft" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-mono-soft" />
      </div>

      <div className="h-12 w-full rounded-xl bg-mono-soft" />

      <div className="rounded-2xl border border-mono-border/40 bg-mono-card overflow-hidden shadow-ambient">
        <div className="px-5 py-4 border-b border-mono-border/30 flex items-center justify-between">
          <div className="h-5 w-32 rounded-full bg-mono-soft" />
          <div className="h-5 w-20 rounded-full bg-mono-soft" />
        </div>
        <div className="divide-y divide-outline-variant/30">
          <LoadingRow />
          <LoadingRow />
          <LoadingRow />
          <LoadingRow />
          <LoadingRow />
        </div>
      </div>
    </div>
  );
}
