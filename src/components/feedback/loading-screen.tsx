"use client";

import { createPortal } from "react-dom";

export interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
  videoSrc?: string;
  fullScreen?: boolean;
  bgOpacity?: number;
  accentColor?: string;
}

export function LoadingScreen({
  message = "Preparing your workspace",
  subtitle = "Loading the latest records, controls, and route context.",
  fullScreen = true,
}: LoadingScreenProps) {
  const content = (
    <div style={containerStyle(fullScreen)}>
      <div style={backdropPatternStyle} />
      <div style={panelStyle}>
        <div style={badgeStyle}>MONOLITH</div>
        <div style={indicatorRowStyle}>
          <span style={spinnerStyle} aria-hidden="true" />
          <div style={copyStyle}>
            <h2 style={titleStyle}>{message}</h2>
            {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
          </div>
        </div>
        <div style={progressTrackStyle} aria-hidden="true">
          <span style={progressBarStyle} />
        </div>
      </div>

      <style>{`
        @keyframes mnxLoadingSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes mnxLoadingProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(260%); }
        }
      `}</style>
    </div>
  );

  if (fullScreen && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}

const containerStyle = (fullScreen: boolean): React.CSSProperties => ({
  position: fullScreen ? "fixed" : "relative",
  inset: 0,
  width: fullScreen ? "100vw" : "100%",
  height: fullScreen ? "100dvh" : "100%",
  minHeight: fullScreen ? "100dvh" : "22rem",
  display: "grid",
  placeItems: "center",
  padding: "clamp(1rem, 3vw, 2rem)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--frappe-bg) 96%, transparent), color-mix(in srgb, var(--frappe-bg-subtle) 98%, transparent))",
  color: "var(--frappe-text)",
  fontFamily: "var(--frappe-font-family)",
  overflow: "hidden",
  zIndex: 99999,
  boxSizing: "border-box",
});

const backdropPatternStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: [
    "linear-gradient(to right, color-mix(in srgb, var(--frappe-border) 38%, transparent) 1px, transparent 1px)",
    "linear-gradient(to bottom, color-mix(in srgb, var(--frappe-border) 38%, transparent) 1px, transparent 1px)",
  ].join(","),
  backgroundSize: "2rem 2rem",
  opacity: 0.45,
  pointerEvents: "none",
};

const panelStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "min(100%, 32rem)",
  display: "grid",
  gap: "1rem",
  padding: "1.25rem 1.25rem 1rem",
  border: "1px solid var(--frappe-border)",
  borderRadius: "var(--frappe-radius-md)",
  background: "var(--frappe-surface-raised)",
  boxShadow: "var(--frappe-shadow-base)",
};

const badgeStyle: React.CSSProperties = {
  width: "fit-content",
  minHeight: "1.5rem",
  display: "inline-flex",
  alignItems: "center",
  padding: "0 0.625rem",
  border: "1px solid color-mix(in srgb, var(--frappe-primary) 18%, var(--frappe-border))",
  borderRadius: "999px",
  color: "var(--frappe-primary)",
  background: "var(--frappe-primary-soft)",
  fontSize: "var(--frappe-font-size-xs)",
  fontWeight: "var(--frappe-font-weight-semibold)",
  letterSpacing: "0.08em",
};

const indicatorRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2.25rem minmax(0, 1fr)",
  alignItems: "start",
  gap: "0.875rem",
};

const spinnerStyle: React.CSSProperties = {
  width: "2.25rem",
  height: "2.25rem",
  border: "2px solid color-mix(in srgb, var(--frappe-border-strong) 72%, transparent)",
  borderTopColor: "var(--frappe-primary)",
  borderRadius: "999px",
  animation: "mnxLoadingSpin 0.8s linear infinite",
  boxSizing: "border-box",
};

const copyStyle: React.CSSProperties = {
  minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--frappe-text)",
  fontSize: "var(--frappe-font-size-xl)",
  fontWeight: "var(--frappe-font-weight-semibold)",
  lineHeight: 1.25,
  letterSpacing: "-0.01em",
};

const subtitleStyle: React.CSSProperties = {
  margin: "0.375rem 0 0",
  color: "var(--frappe-text-muted)",
  fontSize: "var(--frappe-font-size-sm)",
  lineHeight: 1.5,
};

const progressTrackStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "0.25rem",
  overflow: "hidden",
  borderRadius: "999px",
  background: "var(--frappe-bg-subtle)",
};

const progressBarStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "36%",
  borderRadius: "inherit",
  background:
    "linear-gradient(90deg, var(--frappe-primary-active), var(--frappe-primary), var(--frappe-primary-hover))",
  animation: "mnxLoadingProgress 1.4s ease-in-out infinite",
};

export default LoadingScreen;
