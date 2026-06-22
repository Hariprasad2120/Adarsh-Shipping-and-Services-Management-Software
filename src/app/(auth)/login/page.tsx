"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { clearStaleSessionData } from "@/lib/logout";
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
import { Input } from "@/components/ui/input";
import { HarborScene3D } from "@/components/login/harbor-scene-3d";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Clear any stale session data from a previous user on mount
  useEffect(() => {
    clearStaleSessionData();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
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

    // Clear any remaining stale data from a previous user before navigating
    clearStaleSessionData();

    setIsLoading(false);
    setIsAuthenticated(true);
    setTimeout(() => {
      // Full page navigation instead of client-side router — ensures:
      // 1. Server layout runs auth() fresh with the new JWT
      // 2. Browser doesn't serve stale RSC cache from previous user
      // 3. New sessionNonce is picked up for welcome animation
      window.location.replace("/dashboard");
    }, 2500);
  };

  return (
    <div className="grid min-h-screen bg-[#1A1F24] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 bg-[#1A1F24] lg:flex">
        <div className="absolute left-10 top-10 z-50">
          <div className="flex items-center gap-4">
            <BrandMark />
          </div>
        </div>

        <div className="absolute inset-0 z-10">
          <HarborScene3D
            email={email}
            password={password}
            isTyping={isTyping}
            isTypingPassword={isTypingPassword}
            isAuthenticated={isAuthenticated}
            error={error}
            mousePos={mousePos}
          />
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
                <h1 className="ds-h1 heading-icon-none text-white">
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
                  <Input
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
                    className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-[#00A89D]/50 focus:bg-white/[0.06] focus-visible:ring-4 focus-visible:ring-[#00A89D]/10"
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
                  <Input
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
                    className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-12 text-sm text-white placeholder:text-slate-400 focus:border-[#F47920]/50 focus:bg-white/[0.06] focus-visible:ring-4 focus-visible:ring-[#F47920]/10"
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
