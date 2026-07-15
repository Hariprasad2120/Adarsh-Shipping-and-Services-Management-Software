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
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
        <div className="flex flex-col gap-5 border-b border-slate-200 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_10px_24px_rgba(99,102,241,0.25)]">
              <PackageSearch size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Shipments</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Track every CHA shipment, view the current workflow stage, upload requested documents, and respond to queries.
              </p>
            </div>
          </div>

          <form className="flex w-full max-w-xl items-center gap-2" action="/customer-portal/shipments">
            <input type="hidden" name="scope" value={selectedScope} />
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                name="search"
                defaultValue={params.search ?? ""}
                placeholder="Search by job number, title, or reference"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
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
                    ? "bg-indigo-600 text-white shadow-[0_7px_16px_rgba(79,70,229,0.2)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
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
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <FileSearch className="mx-auto text-slate-400" size={34} />
            <h2 className="mt-4 text-base font-semibold text-slate-800">No matching shipments</h2>
            <p className="mt-1 text-sm text-slate-500">Try another search term or choose a different shipment filter.</p>
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
                className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_8px_25px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_16px_38px_rgba(79,70,229,0.1)]"
              >
                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : actionRequired
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                    }`}>
                      {isCompleted ? <CheckCircle2 size={22} /> : actionRequired ? <TriangleAlert size={22} /> : <Ship size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.09em] text-slate-500">{shipment.jobNumber}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : actionRequired
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {isCompleted ? "Completed" : actionRequired ? "Action Required" : "In Progress"}
                        </span>
                      </div>
                      <h2 className="mt-2 truncate text-lg font-semibold text-slate-950 transition group-hover:text-indigo-700">
                        {shipment.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><Clock3 size={15} /> {shipment.currentStage}</span>
                        <span>{shipment.shipmentType}</span>
                        <span>{shipment.clearanceType}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Contact: {shipment.contactName ?? "Customer support assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Progress</span>
                      <span className="text-xl font-bold tracking-tight text-indigo-600">{progress}%</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm font-semibold text-indigo-700">
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
