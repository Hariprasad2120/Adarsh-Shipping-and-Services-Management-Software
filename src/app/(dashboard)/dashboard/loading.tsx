export default function DashboardLoading() {
  return (
    <div className="mnx-dashboard-page" aria-label="Loading dashboard">
      <section className="mnx-dashboard-skeleton mnx-dashboard-skeleton-hero">
        <span /><span /><span /><span />
      </section>
      <section className="mnx-dashboard-skeleton mnx-dashboard-skeleton-tabs">
        <span /><span /><span />
      </section>
      <section className="mnx-dashboard-skeleton-grid">
        <article className="mnx-dashboard-skeleton"><span /><span /><span /></article>
        <article className="mnx-dashboard-skeleton"><span /><span /><span /></article>
        <article className="mnx-dashboard-skeleton"><span /><span /><span /></article>
      </section>
      <span className="sr-only">Loading dashboard data…</span>
    </div>
  );
}
