"use client";

import type { CSSProperties, FormEvent, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { clearStaleSessionData } from "@/lib/logout";
import { isRootControlEmail } from "@/lib/root-access";
import {
  clampLoginProgress,
  DEFAULT_CALLBACK_URL,
  getLoginSceneStatus,
  SUCCESS_TRANSITION_MS,
} from "./login-scene.config";
import type { LoginSceneState } from "./login-scene.types";
import styles from "./monolith-logistics-login.module.css";

type SceneStyle = CSSProperties & {
  "--user-progress": number;
  "--password-progress": number;
  "--pointer-x": string;
  "--pointer-y": string;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function getSafeCallbackUrl(identifier: string) {
  const requestedCallbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
  const fallbackTarget = isRootControlEmail(identifier) ? "/" : DEFAULT_CALLBACK_URL;
  return requestedCallbackUrl?.startsWith("/") ? requestedCallbackUrl : fallbackTarget;
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
      {hidden ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 64 32" aria-hidden="true">
      <path d="m4 18 23-4L39 3l5 1-5 10 17-2c3-.3 5 1 5 3s-2 3-5 3l-17-2 5 10-5 1-12-11-23-4v-4Z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 96 42" aria-hidden="true">
      <path d="M4 6h54v25H4zM58 15h18l12 10v6H58z" />
      <circle cx="22" cy="34" r="6" />
      <circle cx="70" cy="34" r="6" />
      <path d="M76 18v8h9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17.4v.1" />
    </svg>
  );
}

export function MonolithLogisticsLogin() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [sceneState, setSceneState] = useState<LoginSceneState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: "0px", y: "0px" });
  const lastFocus = useRef<"userId" | "password" | null>(null);
  const userIdInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const userProgress = clampLoginProgress(userId.trim().length / 12);
  const passwordProgress = clampLoginProgress(password.length / 10);
  const busy = sceneState === "authenticating" || sceneState === "success";
  const status = useMemo(() => getLoginSceneStatus(sceneState), [sceneState]);

  useEffect(() => {
    clearStaleSessionData();
  }, []);

  const sceneStyle: SceneStyle = {
    "--user-progress": userProgress,
    "--password-progress": passwordProgress,
    "--pointer-x": pointer.x,
    "--pointer-y": pointer.y,
  };

  function handleScenePointerMove(event: PointerEvent<HTMLElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
    setPointer({ x: `${x.toFixed(2)}px`, y: `${y.toFixed(2)}px` });
  }

  function resetPointer() {
    setPointer({ x: "0px", y: "0px" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setError(null);

    if (!userId.trim() || !password) {
      setSceneState("failure");
      setError("Enter both your user ID and password.");
      if (!userId.trim()) userIdInputRef.current?.focus({ preventScroll: true });
      else passwordInputRef.current?.focus({ preventScroll: true });
      return;
    }

    setSceneState("authenticating");

    const normalizedUserId = userId.trim();
    const callbackUrl = getSafeCallbackUrl(normalizedUserId);

    let result: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      result = await signIn("credentials", {
        email: normalizedUserId,
        password,
        rememberMe: rememberMe ? "true" : "false",
        redirect: false,
        callbackUrl,
      });
    } catch {
      result = undefined;
    }

    if (!result || result.error) {
      passwordInputRef.current?.focus({ preventScroll: true });
      setSceneState("failure");
      setError("Sign in failed. Check your credentials — after several failed attempts the account is temporarily locked.");
      return;
    }

    clearStaleSessionData();
    setSceneState("success");
    await wait(SUCCESS_TRANSITION_MS);
    window.location.replace(result.url ?? callbackUrl);
  }

  return (
    <div
      className={styles.page}
      data-monolith-login=""
      data-state={sceneState}
      style={sceneStyle}
      onPointerMove={handleScenePointerMove}
      onPointerLeave={resetPointer}
    >
      <section className={styles.scene} aria-label="Live Monolith logistics network">
        <div className={styles.sceneImage} aria-hidden="true">
          <Image
            src="/login/logistics-port.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 64vw"
          />
        </div>
        <div className={styles.sceneShade} aria-hidden="true" />
        <div className={styles.sceneAtmosphere} aria-hidden="true" />

        <header className={styles.brandHeader}>
          <Image src="/brand/monolith-mark.svg" alt="" width={52} height={52} priority />
          <div>
            <strong>MONOLITH</strong>
            <span>Intelligent Logistics. Limitless Delivery.</span>
          </div>
        </header>

        <svg className={styles.routes} viewBox="0 0 1000 900" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="routeGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="seaRoute" x1="0" x2="1">
              <stop offset="0" stopColor="#1ad8e6" stopOpacity=".1" />
              <stop offset=".5" stopColor="#52ddff" />
              <stop offset="1" stopColor="#4fffd0" />
            </linearGradient>
            <linearGradient id="landRoute" x1="0" x2="1">
              <stop offset="0" stopColor="#36ddec" />
              <stop offset="1" stopColor="#5cffb8" />
            </linearGradient>
          </defs>
          <path
            className={styles.airRoute}
            d="M390 178C520 125 650 150 730 270C768 325 780 382 738 430"
            pathLength="100"
          />
          <path
            className={styles.seaRoute}
            d="M218 536C310 510 386 490 470 440C545 396 616 360 724 390"
            pathLength="100"
            style={{ strokeDashoffset: 100 - userProgress * 74 }}
          />
          <path
            className={styles.landRoute}
            d="M398 735C493 685 566 665 650 668C741 670 805 632 872 565"
            pathLength="100"
            style={{ strokeDashoffset: 100 - passwordProgress * 82 }}
          />
        </svg>

        <div className={styles.aircraftMarker} aria-hidden="true">
          <PlaneIcon />
        </div>

        <div className={styles.vesselPulse} aria-hidden="true" />
        <div className={styles.truckLight} aria-hidden="true" />
        <div className={styles.truckDispatch} aria-hidden="true">
          <TruckIcon />
        </div>

        <section className={styles.portStatus} aria-live="polite">
          <span>PORT STATUS</span>
          <strong>{sceneState === "success" ? "Cleared for dispatch" : "Port systems ready"}</strong>
          <p>{sceneState === "failure" ? "Clearance interrupted" : "All systems operational"}</p>
          <dl>
            <div><dt>Active ships</dt><dd className="ds-numeric">23</dd></div>
            <div><dt>Containers</dt><dd className="ds-numeric">1,842</dd></div>
            <div><dt>On-time performance</dt><dd className="ds-numeric">87%</dd></div>
          </dl>
        </section>

        <section className={styles.liveTracking} aria-hidden="true">
          <span>LIVE TRACKING</span>
          <svg viewBox="0 0 240 80">
            <path d="M10 54C42 18 77 68 111 39C147 9 170 70 229 31" />
            <circle cx="11" cy="53" r="4" />
            <circle cx="65" cy="45" r="4" />
            <circle cx="112" cy="39" r="4" />
            <circle cx="174" cy="46" r="4" />
            <circle cx="229" cy="31" r="4" />
          </svg>
          <div>
            <i /> Sea route <i /> Land route <i /> Air route
          </div>
        </section>

        <div className={styles.sceneStatus} role="status" aria-live="polite">
          <span>{status.eyebrow}</span>
          <strong>{status.title}</strong>
        </div>

        {sceneState === "failure" ? (
          <div className={styles.sceneError} role="alert">
            <WarningIcon />
            <div>
              <strong>Shipment failed to load</strong>
              <span>Verify credentials and retry clearance.</span>
            </div>
          </div>
        ) : null}

        <footer className={styles.sceneFooter} aria-hidden="true">
          <div><span>◎</span><strong>Real-time visibility</strong><small>End-to-end cargo tracking</small></div>
          <div><span>◇</span><strong>Secure &amp; compliant</strong><small>Enterprise-grade access control</small></div>
          <div><span>⌁</span><strong>Dispatch intelligence</strong><small>Route-aware operational handoff</small></div>
        </footer>
      </section>

      <section className={styles.authRegion} aria-label="Sign in">
        <div className={styles.panelGlow} aria-hidden="true" />
        <form className={styles.loginCard} onSubmit={handleSubmit} noValidate>
          <div className={styles.mobileBrand}>
            <Image src="/brand/monolith-mark.svg" alt="" width={46} height={46} />
            <div>
              <strong>MONOLITH</strong>
              <span>Intelligent Logistics</span>
            </div>
          </div>

          <div className={styles.locale} aria-label="Current language">
            <GlobeIcon />
            <span>EN</span>
          </div>

          <div className={styles.cardHeading}>
            <span>LIVE OPERATIONS</span>
            <h1 className="ds-h1">LOG IN TO YOUR<br />COMMAND CENTER</h1>
            <p>Credential checks remain encrypted end-to-end across your secure operations workspace.</p>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="userId">User ID</label>
            <div className={styles.inputShell}>
              <UserIcon />
              <input
                ref={userIdInputRef}
                id="userId"
                name="userId"
                type="text"
                autoComplete="username"
                placeholder="Enter your user ID"
                value={userId}
                disabled={busy}
                onFocus={() => {
                  lastFocus.current = "userId";
                  setSceneState(userId ? "userIdTyping" : "userIdFocused");
                }}
                onChange={(event) => {
                  setUserId(event.target.value);
                  setError(null);
                  setSceneState(event.target.value ? "userIdTyping" : "userIdFocused");
                }}
                onBlur={() => {
                  if (!busy && sceneState !== "failure") setSceneState("idle");
                }}
                aria-invalid={Boolean(error)}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password">Password</label>
            <div className={styles.inputShell}>
              <LockIcon />
              <input
                ref={passwordInputRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                disabled={busy}
                onFocus={() => {
                  lastFocus.current = "password";
                  setSceneState(password ? "passwordTyping" : "passwordFocused");
                }}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                  setSceneState(event.target.value ? "passwordTyping" : "passwordFocused");
                }}
                onBlur={() => {
                  if (!busy && sceneState !== "failure") setSceneState("idle");
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
              />
              <button
                className={styles.passwordToggle}
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={busy}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>

          <div className={styles.formMeta}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={busy}
              />
              <span aria-hidden="true"><CheckIcon /></span>
              Remember me
            </label>
            <a href="/forgot-password">Forgot password?</a>
          </div>

          {error ? <p id="login-error" className={styles.formError} role="alert">{error}</p> : null}

          <button className={styles.primaryButton} type="submit" disabled={busy}>
            <span>
              {sceneState === "authenticating"
                ? "VERIFYING CLEARANCE"
                : sceneState === "success"
                  ? "DISPATCH APPROVED"
                  : "LOG IN"}
            </span>
            {sceneState === "success" ? <CheckIcon /> : <ArrowIcon />}
            <i aria-hidden="true" />
          </button>

          <div className={styles.divider}><span>or</span></div>

          <button
            className={styles.ssoButton}
            type="button"
            disabled={busy}
            onClick={() => void signIn("google", { callbackUrl: getSafeCallbackUrl(userId.trim()) })}
          >
            <GlobeIcon />
            Log in with SSO
          </button>

          <div className={styles.requestAccess}>
            New to Monolith? <a href="/request-access">Request access</a>
          </div>

          <div className={styles.securityLine} aria-hidden="true">
            <span /> Encrypted session <span /> Protected workspace
          </div>
        </form>
      </section>

      <div className={styles.successCurtain} aria-hidden="true">
        <div><CheckIcon /></div>
        <strong>Dispatch confirmed</strong>
      </div>
    </div>
  );
}
