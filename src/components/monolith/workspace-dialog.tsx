"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonolithIconAction, MonolithSpecLabel } from "./foundation";

export type WorkspaceDialogSize =
  | "compact"
  | "default"
  | "wide"
  | "workspace";

interface WorkspaceDialogLayerProps {
  children: React.ReactNode;
  className?: string;
  describedBy?: string;
  labelledBy?: string;
  onClose: () => void;
  open: boolean;
  size?: WorkspaceDialogSize;
  style?: React.CSSProperties;
}

interface WorkspaceDialogProps {
  children: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  eyebrow: string;
  footer?: React.ReactNode;
  onClose: () => void;
  open: boolean;
  size?: WorkspaceDialogSize;
  title: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let bodyLockDepth = 0;
let bodyOverflowBeforeDialogs = "";
let bodyPaddingBeforeDialogs = "";

function lockDocumentScroll() {
  if (bodyLockDepth === 0) {
    bodyOverflowBeforeDialogs = document.body.style.overflow;
    bodyPaddingBeforeDialogs = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const computedPadding =
      Number.parseFloat(window.getComputedStyle(document.body).paddingRight) ||
      0;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${computedPadding + scrollbarWidth}px`;
    }
  }

  bodyLockDepth += 1;

  return () => {
    bodyLockDepth = Math.max(0, bodyLockDepth - 1);
    if (bodyLockDepth === 0) {
      document.body.style.overflow = bodyOverflowBeforeDialogs;
      document.body.style.paddingRight = bodyPaddingBeforeDialogs;
    }
  };
}

export function WorkspaceDialogLayer({
  children,
  className,
  describedBy,
  labelledBy,
  onClose,
  open,
  size = "default",
  style,
}: WorkspaceDialogLayerProps) {
  const surfaceRef = React.useRef<HTMLElement>(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const unlockDocumentScroll = lockDocumentScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const surface = surfaceRef.current;
      if (!surface) return;

      const focusable = Array.from(
        surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        surface.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === first || !surface.contains(activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      surfaceRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      unlockDocumentScroll();
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="mnx-dialog-layer">
      <div
        className="mnx-dialog-backdrop"
        aria-hidden="true"
        onMouseDown={onClose}
      />
      <section
        ref={surfaceRef}
        className={cn(
          "mnx-dialog-surface",
          `mnx-dialog-surface-${size}`,
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        style={style}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function WorkspaceDialog({
  children,
  className,
  description,
  eyebrow,
  footer,
  onClose,
  open,
  size = "default",
  title,
}: WorkspaceDialogProps) {
  const generatedId = React.useId().replace(/:/g, "");
  const titleId = `mnx-dialog-title-${generatedId}`;
  const descriptionId = description
    ? `mnx-dialog-description-${generatedId}`
    : undefined;

  return (
    <WorkspaceDialogLayer
      className={cn("mnx-dialog", className)}
      describedBy={descriptionId}
      labelledBy={titleId}
      onClose={onClose}
      open={open}
      size={size}
    >
      <header>
        <div>
          <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <MonolithIconAction onClick={onClose} aria-label="Close dialog">
          <X size={17} />
        </MonolithIconAction>
      </header>
      <div className="mnx-dialog-content">{children}</div>
      {footer ? <footer>{footer}</footer> : null}
    </WorkspaceDialogLayer>
  );
}
