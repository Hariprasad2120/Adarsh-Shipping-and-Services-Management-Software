import * as React from "react";
import { cn } from "@/lib/utils";
import { DsDisplay, DsBody, DsMeta } from "./ds-text";

/**
 * WelcomeNote — reusable page-intro band for the Monolith design system.
 *
 * Left: eyebrow + title + one orienting line (+ optional actions).
 * Right: a `trailing` slot — drop a PunchCard, a compact date, or nothing.
 *
 * Use it at the very top of a route. Keep `message` to one line; on dense
 * operational routes prefer title-only.
 */

export interface WelcomeNoteAction {
  label: string;
  href: string;
}

export interface WelcomeNoteProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** e.g. "Hello, Margaret" or "Freight forwarding" */
  title: React.ReactNode;
  /** small uppercase line above the title */
  eyebrow?: React.ReactNode;
  /** one orienting sentence; omit on dense routes */
  message?: React.ReactNode;
  /** DS buttons/links rendered under the message */
  actions?: React.ReactNode;
  /** right-aligned slot — a PunchCard, a date chip, etc. */
  trailing?: React.ReactNode;
  /** show the built-in date chip in the trailing area (ignored if `trailing` set) */
  showDate?: boolean;
  /** date for the built-in chip; defaults to today */
  date?: Date;
}

const CHIP_FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "2-digit",
  month: "short",
};

export function WelcomeNote({
  title,
  eyebrow,
  message,
  actions,
  trailing,
  showDate = false,
  date,
  className,
  ...rest
}: WelcomeNoteProps) {
  const when = date ?? new Date();

  const builtInDate =
    !trailing && showDate ? (
      <p className="ds-welcome-datechip">
        <DsMeta small>Today</DsMeta>
        <time dateTime={when.toISOString()}>
          {new Intl.DateTimeFormat("en-IN", CHIP_FMT).format(when)}
        </time>
      </p>
    ) : null;

  const right = trailing ?? builtInDate;

  return (
    <section className={cn("ds-welcome", className)} {...rest}>
      <div className="ds-welcome-lede">
        {eyebrow ? (
          <DsMeta as="p" small className="ds-welcome-eyebrow">
            {eyebrow}
          </DsMeta>
        ) : null}

        <DsDisplay as="h1" level="lg" className="ds-welcome-title">
          {title}
        </DsDisplay>

        {message ? (
          <DsBody as="p" className="ds-welcome-message">
            {message}
          </DsBody>
        ) : null}

        {actions ? <div className="ds-welcome-actions">{actions}</div> : null}
      </div>

      {right ? <div className="ds-welcome-trailing">{right}</div> : null}
    </section>
  );
}
