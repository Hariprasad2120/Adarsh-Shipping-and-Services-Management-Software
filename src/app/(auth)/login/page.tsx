"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Anchor,
  ArrowRight,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

function BrandMark({ mobile = false }: { mobile?: boolean }) {
  const [logoError, setLogoError] = useState(false);

  if (!logoError) {
    return (
      <img 
        src="/Logo.png" 
        alt="Adarsh Shipping & Services" 
        className={`${mobile ? "h-10" : "h-14"} w-auto object-contain`}
        onError={() => setLogoError(true)}
      />
    );
  }

  return (
    <>
      <div className={`relative flex items-center justify-center ${mobile ? "size-10" : "size-12"} ${mobile ? "" : "shadow-lg"}`}>
        <div className={`absolute inset-0 ${mobile ? "rounded-lg" : "rounded-xl"} bg-[#00A89D] opacity-90 transform rotate-45`} />
        <div className={`absolute inset-0 ${mobile ? "rounded-lg" : "rounded-xl"} bg-[#F47920] opacity-90 mix-blend-screen transform rotate-[60deg]`} />
        <Anchor className={`relative z-10 text-white ${mobile ? "size-5" : "size-6"}`} />
      </div>
      <div className={`flex flex-col ${mobile ? "text-left" : ""}`}>
        <span className={`${mobile ? "text-xl" : "text-3xl"} font-black text-[#00A89D] tracking-wider leading-none`}>
          ADARSH
        </span>
        <span
          className={`${mobile ? "text-[9px]" : "text-[11px]"} mt-1 font-bold uppercase tracking-[0.2em] text-[#F47920]`}
        >
          Shipping & Services
        </span>
      </div>
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isTypingPassword, setIsTypingPassword] = useState(false);
  const [error, setError] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasGrabbedContainer, setHasGrabbedContainer] = useState(false);

  const shouldHaveContainer = isTyping || email.length > 0 || isTypingPassword || password.length > 0;
  const shouldHaveTruck = isTypingPassword || password.length > 0;

  useEffect(() => {
    if (shouldHaveContainer === hasGrabbedContainer) {
      return;
    }

    const startTimer = window.setTimeout(() => {
      setIsFetching(true);
    }, 0);

    const finishTimer = window.setTimeout(() => {
      setHasGrabbedContainer(shouldHaveContainer);
      setIsFetching(false);
    }, 1000);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(finishTimer);
    };
  }, [shouldHaveContainer, hasGrabbedContainer, isFetching]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsLoaded(true);
    });

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsAuthenticated(true);
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 2500);
  };

  const shipOffset = (mousePos.x - 0.5) * -40;
  const craneOffset = (mousePos.x - 0.5) * 15;

  return (
    <div className="grid min-h-screen bg-[#1A1F24] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 bg-[#1A1F24] lg:flex">
        <div className="absolute left-10 top-10 z-50">
          <div className="flex items-center gap-4">
            <BrandMark />
          </div>
        </div>

        <div className="absolute inset-0 z-10 flex flex-col justify-end">
          <div className="absolute inset-0 bg-gradient-to-b from-[#111518] to-[#1A2229]">
            <div
              className="absolute left-[20%] top-32 h-10 w-40 rounded-full bg-white/5 blur-2xl transition-transform duration-1000"
              style={{ transform: `translateX(${shipOffset * 0.5}px)` }}
            />
            <div
              className="absolute right-[25%] top-48 h-12 w-64 rounded-full bg-white/5 blur-2xl transition-transform duration-1000"
              style={{ transform: `translateX(${shipOffset * 0.3}px)` }}
            />
          </div>

          <div
            className="absolute bottom-[18%] z-20 h-[55px] w-[350px] transition-all duration-[2000ms] ease-out"
            style={{ 
              left: isLoaded ? `calc(50% + ${shipOffset}px)` : "-20%", 
              transform: "translateX(-50%)",
              opacity: isLoaded ? 1 : 0
            }}
          >
            <div className="relative h-full w-full rounded-b-3xl bg-[#111]">
              <div className="absolute bottom-full left-6 h-10 w-14 border border-[#005C55] bg-[#007A72]" />
              <div className="absolute bottom-full left-[5.5rem] h-10 w-14 border border-[#A64C0D] bg-[#C85D10]" />
              <div className="absolute bottom-full left-[9.5rem] mb-10 h-10 w-14 border border-[#007A72] bg-[#00A89D]" />
              <div className="absolute bottom-full left-[9.5rem] h-10 w-14 border border-[#111] bg-[#2D2D2D]" />
              <div className="absolute bottom-full right-6 h-20 w-20 border-l border-[#2D2D2D] bg-[#1A1F24]">
                <div className="mt-3 h-5 w-full border-y border-[#F47920]/40 bg-[#F47920]/20" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-[10%] z-30 h-[12%] w-full overflow-hidden bg-[#151D24]">
            <div className="h-full w-full animate-pulse bg-[linear-gradient(90deg,transparent_0%,#00A89D_50%,transparent_100%)] opacity-20" />
            <div className="absolute top-0 h-[1px] w-full bg-[#00A89D]/30" />
          </div>

          <div className="absolute bottom-0 z-40 h-[10%] w-full border-t-2 border-[#F47920]/50 bg-[#0A0C0E] shadow-[0_-5px_20px_rgba(244,121,32,0.1)]">
            <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#F47920,#F47920_10px,transparent_10px,transparent_20px)] opacity-20" />
          </div>

          <div
            className="absolute bottom-[10%] left-12 z-50 transition-transform duration-300"
            style={{ transform: `translateX(${craneOffset}px)` }}
          >
            <div className="relative h-[450px] w-20 border-l-4 border-[#1A1F24] bg-[#2D2D2D] shadow-2xl">
              <div className="absolute left-0 top-20 h-1 w-full rotate-45 bg-[#1A1F24]" />
              <div className="absolute left-0 top-40 h-1 w-full -rotate-45 bg-[#1A1F24]" />

              <div className="absolute left-0 top-12 h-10 w-[450px] border-t-2 border-[#F47920]/80 bg-[#2D2D2D]">
                <div
                  className="absolute top-full flex h-6 w-14 justify-center bg-[#F47920] shadow-[0_5px_15px_rgba(244,121,32,0.4)] transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{ left: hasGrabbedContainer ? "300px" : "80px" }}
                >
                  <div
                    className="relative w-1.5 bg-[#444] transition-all duration-1000 ease-in-out"
                    style={{ height: isAuthenticated ? "100px" : isFetching ? "320px" : !hasGrabbedContainer ? "100px" : (shouldHaveTruck || error) ? "290px" : "100px" }}
                  >
                    <div className="absolute bottom-0 left-1/2 w-16 h-2 -translate-x-1/2 bg-[#F47920] rounded-sm shadow-md z-10" />

                    <div 
                      className={`absolute bottom-[-48px] left-1/2 flex h-[48px] w-[140px] -translate-x-1/2 items-center justify-center overflow-hidden border-2 transition-all duration-500 ${error ? "border-red-600 bg-red-500 shadow-[0_10px_20px_rgba(220,38,38,0.4)]" : "border-[#007A72] bg-[#00A89D] shadow-[0_10px_20px_rgba(0,168,157,0.3)]"}`}
                      style={{ opacity: (!hasGrabbedContainer || isAuthenticated) ? 0 : 1 }}
                    >
                      <div className="absolute inset-0 flex justify-evenly px-1">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className={`h-full w-[3px] ${error ? "bg-red-700/40" : "bg-[#007A72]/40"}`} />
                        ))}
                      </div>

                      <div
                        className={`absolute inset-0 flex origin-center transition-all duration-700 ${error ? "bg-red-600" : "bg-[#007A72]"} ${showPassword || error ? "scale-y-0 opacity-0" : "scale-y-100 opacity-100"}`}
                      >
                        <div className={`h-full w-1/2 border-r-2 ${error ? "border-red-800" : "border-[#005C55]"}`} />
                        <div className={`h-full w-1/2 border-l-2 ${error ? "border-red-800" : "border-[#005C55]"}`} />
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                        {error ? (
                          <span className="animate-pulse rounded bg-white/90 px-2 py-1 text-xs font-black tracking-widest text-red-600 shadow-lg">
                            REJECTED
                          </span>
                        ) : showPassword ? (
                          <span className="animate-pulse rounded bg-white/90 px-2 py-1 text-xs font-black tracking-widest text-[#F47920] shadow-lg">
                            VERIFIED
                          </span>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/30">
                            <div className="h-4 w-4 rounded-full bg-white/50" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute bottom-[10%] z-40 flex items-end transition-all ease-in-out"
            style={{
              left: isAuthenticated ? "-50vw" : (shouldHaveTruck || error) ? "180px" : "100vw",
              transform: `translateX(${craneOffset}px)`,
              transitionDuration: isAuthenticated ? "2500ms" : "1000ms"
            }}
          >
            <div className="relative z-20 h-20 w-24 rounded-tl-2xl rounded-tr-md border-b-4 border-[#C85D10] bg-[#F47920] shadow-lg">
              <div className="absolute left-3 top-3 h-8 w-10 overflow-hidden rounded-tl-xl border-r-2 border-b-2 border-[#C85D10]/50 bg-[#E0F7F6]/80">
                <div className="absolute inset-0 translate-x-4 -skew-x-12 bg-white/40" />
              </div>
              <div
                className={`absolute bottom-3 left-0 h-5 w-2 rounded-r transition-all duration-300 ${showPassword ? "bg-white shadow-[[-30px_0_40px_20px_rgba(255,255,255,0.9)]]" : "bg-slate-300"}`}
              />
              <div className="absolute -bottom-4 left-3 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#333] bg-[#111]">
                <div className={`h-3 w-3 rounded-full bg-[#555] ${shouldHaveTruck || isLoading || isAuthenticated ? "animate-spin" : ""}`} />
              </div>
              <div className="absolute -bottom-4 right-3 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#333] bg-[#111]">
                <div className={`h-3 w-3 rounded-full bg-[#555] ${shouldHaveTruck || isLoading || isAuthenticated ? "animate-spin" : ""}`} />
              </div>
            </div>

            <div className="relative -ml-2 mb-4 h-4 w-[180px] border-t border-[#444] bg-[#2D2D2D]">
              <div 
                className="absolute bottom-full left-4 h-[48px] w-[140px] flex items-center justify-center overflow-hidden border-2 border-[#007A72] bg-[#00A89D] shadow-[0_10px_20px_rgba(0,168,157,0.3)] transition-all duration-500"
                style={{ opacity: isAuthenticated ? 1 : 0 }}
              >
                <div className="absolute inset-0 flex justify-evenly px-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-full w-[3px] bg-[#007A72]/40" />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                  <span className="rounded bg-white/90 px-2 py-1 text-xs font-black tracking-widest text-[#F47920] shadow-lg">
                    VERIFIED
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#333] bg-[#111]">
                <div className={`h-3 w-3 rounded-full bg-[#555] ${shouldHaveTruck || isLoading || isAuthenticated ? "animate-spin" : ""}`} />
              </div>
              <div className="absolute -bottom-4 right-14 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#333] bg-[#111]">
                <div className={`h-3 w-3 rounded-full bg-[#555] ${shouldHaveTruck || isLoading || isAuthenticated ? "animate-spin" : ""}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-50 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,168,157,0.15),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 z-50 bg-[radial-gradient(ellipse_at_top_right,rgba(244,121,32,0.1),transparent_50%)]" />

        <div className="absolute bottom-8 left-10 z-50 flex items-center gap-6 text-xs font-medium text-slate-400">
          <a href="#" className="transition-colors hover:text-[#00A89D]">Privacy Policy</a>
          <a href="#" className="transition-colors hover:text-[#00A89D]">Terms of Service</a>
          <a href="#" className="transition-colors hover:text-[#00A89D]">Port Operations</a>
        </div>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#111518] to-[#1A2229] p-6 text-slate-900 dark:text-white lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,168,157,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(244,121,32,0.1),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#1A1F24] via-[#1A1F24]/75 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative w-full max-w-[440px]">
          <div className="absolute -inset-[1px] rounded-[32px] bg-gradient-to-r from-[#00A89D]/40 via-[#F47920]/35 to-[#00A89D]/40 opacity-30" />

          <div className="relative overflow-hidden rounded-[31px] border border-white/10 bg-[#1A1F24]/95 p-8 shadow-2xl backdrop-blur-3xl sm:p-10">
            <div className="mb-10 text-center">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-[#00A89D]/15 blur-2xl transition-all duration-700" />
                  <div className="relative z-10">
                    <BrandMark mobile />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  OPERATIONS PORTAL
                </h1>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Secured Logistics Network
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center px-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#00A89D] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                    System Ready
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <User
                    className={`absolute left-4 top-1/2 size-4 -translate-y-1/2 transition-colors duration-300 ${
                      isTyping && !isTypingPassword
                        ? "text-[#00A89D]"
                        : "text-slate-600"
                    }`}
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="Identification Email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    onFocus={() => {
                      setIsTyping(true);
                      setIsTypingPassword(false);
                    }}
                    onBlur={() => setIsTyping(false)}
                    required
                    className="h-14 w-full rounded-2xl border border-white/5 bg-white/[0.03] pl-12 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-400 placeholder:opacity-100 focus:border-[#00A89D]/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#00A89D]/5"
                    style={{ colorScheme: "dark" }}
                  />
                  <div
                    className={`absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#00A89D]/50 to-transparent transition-opacity duration-500 ${
                      isTyping && !isTypingPassword ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock
                    className={`absolute left-4 top-1/2 size-4 -translate-y-1/2 transition-colors duration-300 ${
                      isTypingPassword ? "text-[#F47920]" : "text-slate-600"
                    }`}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Access Key"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onFocus={() => {
                      setIsTyping(true);
                      setIsTypingPassword(true);
                    }}
                    onBlur={() => {
                      setIsTyping(false);
                      setIsTypingPassword(false);
                    }}
                    required
                    className="h-14 w-full rounded-2xl border border-white/5 bg-white/[0.03] pl-12 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-400 placeholder:opacity-100 focus:border-[#F47920]/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#F47920]/5"
                    style={{ colorScheme: "dark" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                  <div
                    className={`absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#F47920]/50 to-transparent transition-opacity duration-500 ${
                      isTypingPassword ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
                <div className="flex justify-end">
                  <a
                    href="#"
                    className="text-sm font-medium text-[#00A89D] transition-colors hover:text-[#52d6cd]"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-[11px] font-medium text-red-400">
                  <ShieldCheck className="size-4 shrink-0" />
                  {error}
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  className="group relative h-14 w-full overflow-hidden rounded-2xl bg-[#F47920] text-xs font-black uppercase tracking-[0.3em] text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(245,130,32,0.5)] active:translate-y-0 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform duration-700 group-hover:translate-x-[100%]" />
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Establish Connection</span>
                      <ArrowRight className="size-4" />
                    </div>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-10 flex flex-col items-center gap-6 border-t border-white/5 pt-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-slate-500">
                <span>New Personnel?</span>
                <a
                  href="#"
                  className="group flex items-center gap-1 text-white transition-colors hover:text-[#00A89D]"
                >
                  Contact Registry
                  <ChevronRight className="size-3 transition-transform group-hover:translate-x-1" />
                </a>
              </div>

              <div className="flex items-center gap-4 opacity-40">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                  <ShieldCheck className="size-3" />
                  AES-256
                </div>
                <div className="h-3 w-px bg-white/20" />
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                  <Globe className="size-3" />
                  GLOBAL-HUB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
