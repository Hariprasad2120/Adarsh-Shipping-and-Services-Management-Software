type PortalPlaceholderProps = {
  title: string;
  description: string;
};

export function PortalPlaceholder({ title, description }: PortalPlaceholderProps) {
  return (
    <section className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
      <p className="ds-label">Customer Portal Reset</p>
      <h2 className="ds-h2 mt-2">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">{description}</p>
    </section>
  );
}
