"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setOrgRequireMfa } from "./actions";

export function SecurityPolicyClient({ requireMfa }: { requireMfa: boolean }) {
  const [on, setOn] = useState(requireMfa);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (next: boolean) => {
    setError(null);
    setMsg(null);
    start(async () => {
      try {
        const r = await setOrgRequireMfa(password, next);
        setOn(r.requireMfa);
        setPassword("");
        setMsg(`Saved. MFA is now ${r.requireMfa ? "required" : "optional"} for the organisation.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <ShieldCheck size={16} /> Multi-factor authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="mnx-stack">
        <p className="mnx-text-muted">
          When required, every member of this organisation must enrol an
          authenticator before they can hold a session. Platform administrators
          are always required to use MFA regardless of this setting.
        </p>
        <p>
          Current: <strong>{on ? "Required" : "Optional"}</strong>
        </p>
        {error ? (
          <div role="alert" className="mnx-alert mnx-alert-danger">
            {error}
          </div>
        ) : null}
        {msg ? <div className="mnx-alert mnx-alert-success">{msg}</div> : null}
        <label>
          Confirm your password to change this policy
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="mnx-row">
          <Button
            onClick={() => save(!on)}
            disabled={pending || !password}
            variant={on ? "destructive" : "default"}
          >
            {on ? "Make MFA optional" : "Require MFA for everyone"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
