import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, ShipWheel, Workflow } from "lucide-react";

const highlights = [
  {
    title: "Operations Visibility",
    description:
      "Track people, approvals, and daily workflows from one shared operating surface.",
    icon: ShipWheel,
  },
  {
    title: "Secure Access",
    description:
      "Guide teams into the platform with role-based entry and a dedicated login flow.",
    icon: ShieldCheck,
  },
  {
    title: "Connected Modules",
    description:
      "Bring HRMS, attendance, and appraisal processes together without bouncing between tools.",
    icon: Workflow,
  },
];

export default function Home() {
  return (
    <main className="relative h-screen overflow-hidden bg-[#07141c] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,168,157,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,121,32,0.2),transparent_30%),linear-gradient(135deg,#07141c_0%,#0b1f2a_45%,#102937_100%)]" />
      <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-[#00A89D]/10 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-[#F47920]/10 blur-3xl" />

      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-6 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/Logo.png"
              alt="Adarsh Shipping & Services"
              width={56}
              height={56}
              priority
              className="h-12 w-12 rounded-2xl object-cover shadow-lg shadow-black/20"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#00A89D]">
                Adarsh
              </p>
              <p className="text-sm text-slate-300">Shipping & Services</p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/8 px-5 text-sm font-semibold text-white backdrop-blur transition hover:border-[#00A89D]/60 hover:bg-white/12"
          >
            Login
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-[#00A89D]/30 bg-[#00A89D]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#8ce9e2]">
              Unified business operations
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Run logistics and workforce operations from one control deck.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              Monolith Engine brings HRMS, attendance, and appraisal workflows
              into one streamlined portal for your team.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#00A89D] px-6 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(0,168,157,0.35)] transition hover:bg-[#009087]"
              >
                Login to Dashboard
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F47920]/14 text-[#ffb176]">
                    <Icon className="size-4" />
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-white">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-300">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-10 h-28 w-28 rounded-full border border-[#00A89D]/30 bg-[#00A89D]/10 blur-sm" />
            <div className="absolute -right-4 bottom-16 h-24 w-24 rounded-full border border-[#F47920]/30 bg-[#F47920]/10 blur-sm" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#8ce9e2]">
                    Live Control Deck
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    Ready for your team
                  </p>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Active
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl bg-[#081922] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">
                        Attendance sync
                      </p>
                      <p className="mt-1 text-2xl font-semibold">98.4%</p>
                    </div>
                    <div className="rounded-2xl bg-[#00A89D]/15 px-3 py-2 text-sm font-semibold text-[#8ce9e2]">
                      Stable
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/8">
                    <div className="h-2 w-[98.4%] rounded-full bg-[#00A89D]" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/6 p-4">
                    <p className="text-sm text-slate-400">Pending reviews</p>
                    <p className="mt-1 text-2xl font-semibold">24</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Appraisal cycles in approval.
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white/6 p-4">
                    <p className="text-sm text-slate-400">Employees onboarded</p>
                    <p className="mt-1 text-2xl font-semibold">312</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Shared HRMS and attendance records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
