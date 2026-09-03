"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { KeyRound, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmMfaEnrollment,
  disableMfaAction,
  regenerateRecoveryCodesAction,
  startMfaEnrollment,
  type SecurityOverview,
} from "./mfa-actions";
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  removePasskey,
} from "./passkey-actions";

type Props = {
  overview: SecurityOverview;
  hasGoogleIdentity: boolean;
  passwordIsLocal: boolean;
  hasPasskey: boolean;
};

type Enroll =
  | { step: "idle" }
  | { step: "password" }
  | { step: "confirm"; secret: string; qrDataUrl: string; otpauthUri: string }
  | { step: "codes"; codes: string[] };

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="mnx-recovery-codes">
      <p className="mnx-text-muted">
        Store these somewhere safe. Each code works once. They are shown only now.
      </p>
      <pre className="mnx-code-block" aria-label="Recovery codes">
        {codes.join("\n")}
      </pre>
      <Button
        variant="ghost"
        onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}
      >
        Copy all
      </Button>
    </div>
  );
}

export function SecurityCenterClient({
  overview,
  hasGoogleIdentity,
  passwordIsLocal,
  hasPasskey: hasPasskeyInitial,
}: Props) {
  const [passkeyOn, setPasskeyOn] = useState(hasPasskeyInitial);
  const [passkeyPw, setPasskeyPw] = useState("");
  const [mfaOn, setMfaOn] = useState(
    overview.factors.some((f) => f.type === "totp" && f.status === "ACTIVE"),
  );
  const [codesLeft, setCodesLeft] = useState(overview.recoveryCodesRemaining);
  const [enroll, setEnroll] = useState<Enroll>({ step: "idle" });
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const beginEnroll = () =>
    run(async () => {
      const c = await startMfaEnrollment(password);
      setPassword("");
      setEnroll({
        step: "confirm",
        secret: c.secret,
        qrDataUrl: c.qrDataUrl,
        otpauthUri: c.otpauthUri,
      });
    });

  const finishEnroll = () =>
    run(async () => {
      const { recoveryCodes } = await confirmMfaEnrollment(otp);
      setOtp("");
      setMfaOn(true);
      setCodesLeft(recoveryCodes.length);
      setEnroll({ step: "codes", codes: recoveryCodes });
    });

  const disable = () =>
    run(async () => {
      await disableMfaAction(password);
      setPassword("");
      setMfaOn(false);
      setCodesLeft(0);
      setEnroll({ step: "idle" });
    });

  const regen = () =>
    run(async () => {
      const { recoveryCodes } = await regenerateRecoveryCodesAction(password);
      setPassword("");
      setCodesLeft(recoveryCodes.length);
      setEnroll({ step: "codes", codes: recoveryCodes });
    });

  const addPasskey = () =>
    run(async () => {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const options = await beginPasskeyRegistration(passkeyPw);
      const response = await startRegistration(options);
      await finishPasskeyRegistration(response);
      setPasskeyPw("");
      setPasskeyOn(true);
    });

  const dropPasskey = () =>
    run(async () => {
      await removePasskey(passkeyPw);
      setPasskeyPw("");
      setPasskeyOn(false);
    });

  return (
    <div className="mnx-stack-lg">
      {error ? (
        <div role="alert" className="mnx-alert mnx-alert-danger">
          {error}
        </div>
      ) : null}

      {/* ── Multi-factor authentication ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {mfaOn ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}{" "}
            Two-factor authentication (TOTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="mnx-stack">
          <p className="mnx-text-muted">
            {mfaOn
              ? `Enabled. ${codesLeft} recovery code${codesLeft === 1 ? "" : "s"} left.`
              : "Not enabled. Protect your account with an authenticator app."}
            {overview.orgRequiresMfa || overview.platformAdminMfaMandatory ? (
              <>
                {" "}
                <strong>
                  {overview.platformAdminMfaMandatory
                    ? "MFA is mandatory for platform administrators."
                    : "Your organisation requires MFA."}
                </strong>
              </>
            ) : null}
          </p>

          {!mfaOn && enroll.step === "idle" ? (
            <Button onClick={() => setEnroll({ step: "password" })}>
              Set up two-factor authentication
            </Button>
          ) : null}

          {!mfaOn && enroll.step === "password" ? (
            <div className="mnx-stack">
              <label>
                Confirm your password to continue
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="mnx-row">
                <Button onClick={beginEnroll} disabled={pending || !password}>
                  Continue
                </Button>
                <Button variant="ghost" onClick={() => setEnroll({ step: "idle" })}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {enroll.step === "confirm" ? (
            <div className="mnx-stack">
              <p>Scan this in your authenticator app, or enter the code manually:</p>
              <Image
                src={enroll.qrDataUrl}
                alt="TOTP QR code"
                width={220}
                height={220}
                unoptimized
              />
              <code className="mnx-code-inline">{enroll.secret}</code>
              <label>
                Enter the 6-digit code from the app
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </label>
              <div className="mnx-row">
                <Button onClick={finishEnroll} disabled={pending || otp.length < 6}>
                  Verify &amp; enable
                </Button>
                <Button variant="ghost" onClick={() => setEnroll({ step: "idle" })}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {enroll.step === "codes" ? (
            <>
              <RecoveryCodes codes={enroll.codes} />
              <Button variant="ghost" onClick={() => setEnroll({ step: "idle" })}>
                Done
              </Button>
            </>
          ) : null}

          {mfaOn && enroll.step === "idle" ? (
            <div className="mnx-stack">
              <label>
                Confirm your password for a sensitive change
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="mnx-row">
                <Button variant="ghost" onClick={regen} disabled={pending || !password}>
                  <RefreshCw size={14} /> Regenerate recovery codes
                </Button>
                <Button variant="destructive" onClick={disable} disabled={pending || !password}>
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Authentication methods ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <KeyRound size={16} /> Sign-in methods
          </CardTitle>
        </CardHeader>
        <CardContent className="mnx-stack">
          <div className="mnx-row mnx-row-between">
            <span>Password</span>
            <span className="mnx-text-muted">
              {passwordIsLocal ? "Set" : "Not used (external identity)"}
            </span>
          </div>
          <div className="mnx-row mnx-row-between">
            <span>Google</span>
            <span className="mnx-text-muted">
              {hasGoogleIdentity ? "Linked" : "Not linked"}
            </span>
          </div>
          <div className="mnx-row mnx-row-between">
            <span>Passkey / security key</span>
            <span className="mnx-text-muted">
              {passkeyOn ? "Registered" : "Not registered"}
            </span>
          </div>
          <div className="mnx-stack">
            <label>
              Confirm your password to add or remove a passkey
              <Input
                type="password"
                autoComplete="current-password"
                value={passkeyPw}
                onChange={(e) => setPasskeyPw(e.target.value)}
              />
            </label>
            <div className="mnx-row">
              {passkeyOn ? (
                <Button
                  variant="destructive"
                  onClick={dropPasskey}
                  disabled={pending || !passkeyPw}
                >
                  Remove passkey
                </Button>
              ) : (
                <Button onClick={addPasskey} disabled={pending || !passkeyPw}>
                  Add a passkey
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
