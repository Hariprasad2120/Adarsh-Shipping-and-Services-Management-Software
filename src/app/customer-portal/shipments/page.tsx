import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  PackageSearch,
  Search,
  Ship,
  TriangleAlert,
} from "lucide-react";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { listPortalShipments } from "@/modules/customer-portal/service";

type ShipmentScope = "active" | "action" | "completed" | "all";

const filters: Array<{ value: ShipmentScope; label: string }> = [
  { value: "all", label: "All Shipments" },
  { value: "active", label: "Active" },
  { value: "action", label: "Action Required" },
  { value: "completed", label: "Completed" },
];

export default async function CustomerPortalShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: ShipmentScope; search?: string }>;
}) {
  const session = await requirePortalSession();
  const params = await searchParams;
  const selectedScope = params.scope ?? "all";
  const shipments = await listPortalShipments(session.portalUserId, {
    scope: selectedScope,
    search: params.search,
  });

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-outline-variant/60 bg-surface shadow-sm">
        <div className="flex flex-col gap-5 border-b border-outline-variant/60 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="ds-icon-badge h-12 w-12 rounded-2xl">
              <PackageSearch size={22} />
            </div>
            <div>
              <h1 className="ds-h2 text-on-surface">Shipments</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Track every CHA shipment, view the current workflow stage, upload requested documents, and respond to queries.
              </p>
            </div>
          </div>

          <form className="flex w-full max-w-xl items-center gap-2" action="/customer-portal/shipments">
            <input type="hidden" name="scope" value={selectedScope} />
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={17} />
              <input
                name="search"
                defaultValue={params.search ?? ""}
                placeholder="Search by job number, title, or reference"
                className="h-11 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low/40 pl-10 pr-4 text-sm text-on-surface outline-none transition placeholder:text-placeholder focus:border-[#00cec4]/55 focus:bg-surface focus:ring-2 focus:ring-[rgba(14,137,149,0.14)]"
              />
            </div>
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#00cec4] px-5 text-sm font-semibold text-white transition hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]">
              Search
            </button>
          </form>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 py-4 sm:px-7">
          {filters.map((filter) => {
            const active = selectedScope === filter.value;
            return (
              <Link
                key={filter.value}
                href={`/customer-portal/shipments?scope=${filter.value}`}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]"
                    : "border border-outline-variant/60 bg-surface text-on-surface-variant hover:border-[#00cec4]/45 hover:text-[#00cec4]"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4">
        {shipments.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-outline-variant/60 bg-surface p-10 text-center shadow-sm">
            <FileSearch className="mx-auto text-on-surface-variant" size={34} />
            <h2 className="mt-4 text-base font-semibold text-on-surface">No matching shipments</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Try another search term or choose a different shipment filter.</p>
          </div>
        ) : (
          shipments.map((shipment) => {
            const progress = Math.min(100, Math.max(0, shipment.progressPercent));
            const isCompleted = progress >= 100;
            const actionRequired = selectedScope === "action";

            return (
              <Link
                key={shipment.id}
                href={`/customer-portal/shipments/${shipment.id}`}
                className="group overflow-hidden rounded-[22px] border border-outline-variant/60 bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#00cec4]/45 hover:shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
              >
                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      isCompleted
                        ? "bg-[#00cec4]/12 text-[#00cec4]"
                        : actionRequired
                          ? "bg-[#fb923c]/12 text-[#fb923c]"
                          : "bg-[#00cec4]/12 text-[#00cec4]"
                    }`}>
                      {isCompleted ? <CheckCircle2 size={22} /> : actionRequired ? <TriangleAlert size={22} /> : <Ship size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="ds-label">{shipment.jobNumber}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isCompleted
                            ? "bg-[#00cec4]/12 text-[#00cec4]"
                            : actionRequired
                              ? "bg-[#fb923c]/12 text-[#fb923c]"
                              : "bg-[#00cec4]/12 text-[#00cec4]"
                        }`}>
                          {isCompleted ? "Completed" : actionRequired ? "Action Required" : "In Progress"}
                        </span>
                      </div>
                      <h2 className="mt-2 truncate text-lg font-semibold text-on-surface transition group-hover:text-[#00cec4]">
                        {shipment.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                        <span className="inline-flex items-center gap-1.5"><Clock3 size={15} /> {shipment.currentStage}</span>
                        <span>{shipment.shipmentType}</span>
                        <span>{shipment.clearanceType}</span>
                      </div>
                      <p className="mt-3 text-xs text-on-surface-variant">
                        Contact: {shipment.contactName ?? "Customer support assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="ds-label">Progress</span>
                      <span className="text-xl tracking-tight text-[#00cec4] ds-numeric">{progress}%</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-[#00cec4] transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm font-semibold text-[#00cec4]">
                      Open shipment
                      <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
