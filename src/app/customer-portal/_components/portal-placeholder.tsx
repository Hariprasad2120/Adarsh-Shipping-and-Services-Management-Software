type PortalPlaceholderProps = {
  title: string;
  description: string;
};

export function PortalPlaceholder({ title, description }: PortalPlaceholderProps) {
  return (
    <section className="rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-sm">
      <p className="monolith-label">Customer Portal Reset</p>
      <h2 className="monolith-h2 mt-2">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm text-mono-muted">{description}</p>
    </section>
  );
}
