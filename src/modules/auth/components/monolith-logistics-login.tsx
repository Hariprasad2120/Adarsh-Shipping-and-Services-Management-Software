"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { clearStaleSessionData } from "@/lib/logout";
import { isRootControlEmail } from "@/lib/root-access";
import {
  DEFAULT_CALLBACK_URL,
  SUCCESS_TRANSITION_MS,
} from "@/modules/auth/components/login-scene.config";
import styles from "@/modules/auth/components/animated-login.module.css";

type Mood = "idle" | "happy" | "charging" | "shy" | "error";
type SubmitState = "idle" | "loading" | "success";

const CREDENTIAL_QUERY_PARAMETERS = [
  "email",
  "password",
  "rememberMe",
] as const;
const subscribeToHydration = () => () => {};

function MonolithPetGraphic() {
  return (
    <span className={styles.petCharacter} aria-hidden="true">
      <span className={styles.energyRing} />
      <span className={styles.energyRingSecondary} />
      <svg className={styles.petSvg} viewBox="0 0 360 300">
        <g className={styles.petShell}>
          <path
            className={styles.outerShell}
            d="M98 92h164l38 30v70l-38 30H98l-38-30v-70Z"
          />
          <path
            className={styles.faceGlass}
            d="M116 116h128l24 18v46l-24 18H116l-24-18v-46Z"
          />
        </g>

        <g className={styles.leftEar}>
          <path d="m60 132-22 8v34l22 8Z" />
          <path className={styles.earSignal} d="M28 135c-9 11-9 34 0 45" />
        </g>
        <g className={styles.rightEar}>
          <path d="m300 132 22 8v34l-22 8Z" />
          <path className={styles.earSignal} d="M332 135c9 11 9 34 0 45" />
        </g>

        <g className={styles.antenna}>
          <path d="m116 94-15-18 12-10-14-18 8-14" />
          <circle cx="109" cy="30" r="7" />
          <path
            className={styles.antennaSignal}
            d="M91 29c-7 8-7 18 0 26M79 21c-13 14-13 33 0 47"
          />
        </g>

        <g className={styles.facePatch}>
          <rect
            className={styles.patchBox}
            x="122"
            y="136"
            width="38"
            height="38"
            rx="9"
          />
          <g className={styles.patchEye}>
            <rect
              className={styles.crossArmA}
              x="128"
              y="151"
              width="26"
              height="8"
              rx="4"
            />
            <rect
              className={styles.crossArmB}
              x="128"
              y="151"
              width="26"
              height="8"
              rx="4"
            />
          </g>
        </g>

        <g className={styles.eyeLook}>
          <g className={styles.liveEye}>
            <rect x="221" y="146" width="12" height="20" rx="6" />
          </g>
        </g>

        <path className={styles.scanLine} d="M112 185h136" />
      </svg>
    </span>
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function getSafeCallbackUrl(identifier: string) {
  const requestedCallbackUrl = new URLSearchParams(window.location.search).get(
    "callbackUrl",
  );
  const fallbackTarget = isRootControlEmail(identifier)
    ? "/"
    : DEFAULT_CALLBACK_URL;
  return requestedCallbackUrl?.startsWith("/")
    ? requestedCallbackUrl
    : fallbackTarget;
}

function getSameOriginRedirectUrl(
  url: string | null | undefined,
  fallbackUrl: string,
) {
  if (!url) return fallbackUrl;
  if (url.startsWith("/")) return url;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin === window.location.origin
      ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

function removeCredentialQueryParameters() {
  const url = new URL(window.location.href);
  const containedCredentials = CREDENTIAL_QUERY_PARAMETERS.some((parameter) =>
    url.searchParams.has(parameter),
  );

  if (!containedCredentials) return;

  for (const parameter of CREDENTIAL_QUERY_PARAMETERS) {
    url.searchParams.delete(parameter);
  }

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function MonolithLogisticsLogin() {
  const panelRef = useRef<HTMLElement>(null);
  const petRef = useRef<HTMLSpanElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const passwordFocusedRef = useRef(false);
  const frame = useRef<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [mood, setMood] = useState<Mood>("idle");
  const [petMessage, setPetMessage] = useState("Tap me!");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const busy = !hydrated || submitState !== "idle";

  useEffect(() => {
    removeCredentialQueryParameters();
    clearStaleSessionData();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const motionScale = reduceMotion ? 0.35 : 1;

    const followPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (passwordFocusedRef.current) {
        target.current = { x: -0.8, y: -0.08 };
        return;
      }

      const bounds = panelRef.current?.getBoundingClientRect();
      if (!bounds) return;

      target.current = {
        x: Math.max(
          -1,
          Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
        ),
        y: Math.max(
          -1,
          Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
        ),
      };
    };

    const resetPointer = (event: PointerEvent) => {
      if (event.relatedTarget === null && !passwordFocusedRef.current) {
        target.current = { x: 0, y: 0 };
      }
    };

    const animate = () => {
      velocity.current.x =
        (velocity.current.x + (target.current.x - current.current.x) * 0.055) *
        0.78;
      velocity.current.y =
        (velocity.current.y + (target.current.y - current.current.y) * 0.055) *
        0.78;
      current.current.x += velocity.current.x;
      current.current.y += velocity.current.y;

      const x = current.current.x;
      const y = current.current.y;
      const pet = petRef.current;
      const shadow = shadowRef.current;
      const glow = glowRef.current;

      if (pet) {
        pet.style.setProperty("--x", `${x * 76 * motionScale}px`);
        pet.style.setProperty("--y", `${y * 52 * motionScale}px`);
        pet.style.setProperty("--turn", `${x * 5.5 * motionScale}deg`);
        pet.style.setProperty("--skew", `${y * -2.2 * motionScale}deg`);
        const horizontalStretch =
          1 + (Math.abs(x) * 0.11 - Math.abs(y) * 0.055) * motionScale;
        const verticalStretch =
          1 + (Math.abs(y) * 0.1 - Math.abs(x) * 0.05) * motionScale;
        pet.style.setProperty("--stretch-x", `${horizontalStretch}`);
        pet.style.setProperty("--stretch-y", `${verticalStretch}`);
        pet.style.setProperty("--eye-x", `${x * 10 * motionScale}px`);
        pet.style.setProperty("--eye-y", `${y * 5 * motionScale}px`);
        pet.style.setProperty("--face-x", `${x * 2.4 * motionScale}px`);
        pet.style.setProperty("--face-y", `${y * 1.8 * motionScale}px`);
        pet.style.setProperty("--antenna-turn", `${x * -7 * motionScale}deg`);
        pet.style.setProperty("--ear-shift", `${y * 2 * motionScale}px`);
      }

      if (shadow) {
        shadow.style.transform = `translate(calc(-50% + ${x * -16}px), ${y * -6}px) scaleX(${1 - Math.abs(y) * 0.14})`;
      }

      if (glow) {
        glow.style.setProperty("--gx", `${50 + x * 40}%`);
        glow.style.setProperty("--gy", `${50 + y * 38}%`);
      }

      frame.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", followPointer, { passive: true });
    window.addEventListener("pointerout", resetPointer, { passive: true });
    frame.current = window.requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("pointerout", resetPointer);
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  function interactWithPet() {
    if (mood === "idle") {
      setMood("happy");
      setPetMessage("Beep! Good to see you.");
    } else if (mood === "happy") {
      setMood("charging");
      setPetMessage("Charging… 84%");
    } else {
      setMood("idle");
      setPetMessage("Ready for another route!");
    }
  }

  function resetSubmitState() {
    setMessage("");
    if (submitState !== "idle") setSubmitState("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage("Enter a valid work email.");
      emailInputRef.current?.focus({ preventScroll: true });
      setMood("error");
      setPetMessage("That route looks incomplete.");
      return;
    }

    if (!password) {
      setMessage("Enter your password.");
      passwordInputRef.current?.focus({ preventScroll: true });
      setMood("error");
      setPetMessage("The security code is missing.");
      return;
    }

    setMessage("");
    setSubmitState("loading");
    setMood("charging");
    setPetMessage("Verifying your cargo route…");

    const callbackUrl = getSafeCallbackUrl(normalizedEmail);
    let result: Awaited<ReturnType<typeof signIn>> | undefined;

    try {
      result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        rememberMe: remember ? "true" : "false",
        redirect: false,
        callbackUrl,
      });
    } catch {
      result = undefined;
    }

    if (!result || result.error) {
      setSubmitState("idle");
      passwordInputRef.current?.focus({ preventScroll: true });
      setMood("error");
      setPetMessage("Access denied. Please try again.");
      setMessage("Sign in failed. Check your credentials and try again.");
      return;
    }

    clearStaleSessionData();
    setSubmitState("success");
    setMood("happy");
    setPetMessage("You’re in! Let’s get moving.");
    await wait(SUCCESS_TRANSITION_MS);
    window.location.replace(getSameOriginRedirectUrl(result.url, callbackUrl));
  }

  return (
    <main
      className={`${styles.loginPage} ${submitState === "success" ? styles.success : ""}`}
      data-monolith-login
    >
      <section className={styles.loginCard} aria-label="Monolith secure login">
        <aside
          ref={panelRef}
          className={styles.mascotPanel}
          aria-label="Interactive Monolith digital pet"
        >
          <div ref={glowRef} className={styles.cursorGlow} aria-hidden="true" />

          <div className={`${styles.brand} ${styles.brandLight}`}>
            <span className={styles.brandMark} aria-hidden="true">
              <i />
              <i />
            </span>
            <span>
              <strong>MONOLITH</strong>
              <small>Intelligent logistics</small>
            </span>
          </div>

          <button
            type="button"
            className={`${styles.petButton} ${styles[`mood-${mood}`]}`}
            onClick={interactWithPet}
            aria-label={`Interact with Monolith pet. ${petMessage}`}
          >
            <span ref={petRef} className={styles.petFollower}>
              <span className={styles.speechBubble} aria-live="polite">
                {petMessage}
              </span>
              <span className={styles.petRig}>
                <MonolithPetGraphic />
              </span>
            </span>
          </button>

          <div
            ref={shadowRef}
            className={styles.petShadow}
            aria-hidden="true"
          />

          <p className={styles.petStatus}>
            <i />
            {submitState === "success"
              ? "Route cleared. Welcome aboard."
              : password
                ? "Cargo secured. Ready to dispatch."
                : email
                  ? "Route identified. Awaiting clearance."
                  : "Your cargo command center is listening."}
          </p>
        </aside>

        <section className={styles.formPanel} aria-labelledby="login-title">
          <div className={styles.formInner}>
            <div className={`${styles.mobileBrand} ${styles.brand}`}>
              <span className={styles.brandMark} aria-hidden="true">
                <i />
                <i />
              </span>
              <strong>MONOLITH</strong>
            </div>

            <div className={styles.accountIcon} aria-hidden="true">
              <span />
              <i />
            </div>

            <header className={styles.heading}>
              <p>SECURE OPERATIONS ACCESS</p>
              <h1 id="login-title">Welcome back!</h1>
              <span>Enter your login details</span>
            </header>

            <form
              className={styles.loginForm}
              method="post"
              onSubmit={handleSubmit}
              noValidate
            >
              <label className={styles.field}>
                <span>Email</span>
                <span className={styles.inputWrap}>
                  <input
                    ref={emailInputRef}
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="name@company.com"
                    value={email}
                    disabled={busy}
                    aria-invalid={Boolean(message && !email.includes("@"))}
                    aria-describedby={message ? "login-message" : undefined}
                    onFocus={() => {
                      target.current = { x: 0.7, y: -0.12 };
                      setMood("happy");
                      setPetMessage("I found your route!");
                    }}
                    onBlur={() => setMood("idle")}
                    onChange={(event) => {
                      const value = event.target.value;
                      setEmail(value);
                      setMood(value ? "happy" : "idle");
                      setPetMessage(
                        value.length > 12
                          ? "Route almost identified…"
                          : value
                            ? "Reading your route…"
                            : "Tap me!",
                      );
                      resetSubmitState();
                    }}
                  />
                  {email.includes("@") ? (
                    <b className={styles.valid} aria-label="Email entered">
                      ✓
                    </b>
                  ) : null}
                </span>
              </label>

              <label className={styles.field}>
                <span>Password</span>
                <span className={styles.inputWrap}>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    disabled={busy}
                    aria-invalid={Boolean(message && !password)}
                    aria-describedby={message ? "login-message" : undefined}
                    onFocus={() => {
                      passwordFocusedRef.current = true;
                      target.current = { x: -0.8, y: -0.08 };
                      setMood("shy");
                      setPetMessage("I won’t peek. Promise.");
                    }}
                    onBlur={() => {
                      passwordFocusedRef.current = false;
                      target.current = { x: 0, y: 0 };
                      setMood("idle");
                    }}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      resetSubmitState();
                    }}
                  />
                  <button
                    className={styles.visibility}
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={busy}
                  >
                    {showPassword ? "●" : "◉"}
                  </button>
                </span>
              </label>

              <div className={styles.options}>
                <label className={styles.remember}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    disabled={busy}
                  />
                  <span>Remember me</span>
                </label>
                <Link href="/forgot-password" className={styles.textButton}>
                  Forgot password?
                </Link>
              </div>

              <p id="login-message" className={styles.formMessage} role="alert">
                {message}
              </p>

              <button
                className={styles.loginButton}
                type="submit"
                disabled={busy}
              >
                {submitState === "loading" ? (
                  <>
                    <i className={styles.spinner} /> Verifying route…
                  </>
                ) : submitState === "success" ? (
                  <>Access granted ✓</>
                ) : (
                  <>
                    Log in <span>→</span>
                  </>
                )}
              </button>

              <div className={styles.divider}>
                <span>or</span>
              </div>

              <button
                className={styles.ssoButton}
                type="button"
                disabled={busy}
                onClick={() =>
                  void signIn("google", {
                    callbackUrl: getSafeCallbackUrl(email.trim()),
                  })
                }
              >
                <span>◎</span> Log in with SSO
              </button>

              <p className={styles.signup}>
                Don’t have access?
                <Link href="/request-access" className={styles.textButton}>
                  Request access
                </Link>
              </p>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
