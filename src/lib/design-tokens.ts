export const colors = {
  // Brand accent — use for highlights, active states, interactive elements
  accent: "#00cec4",
  accentHover: "#00b8af",
  accentSubtle: "rgba(0, 206, 196, 0.10)",

  // Primary (light: deep teal, dark: cyan)
  primary: {
    light: "#003631",
    dark: "#00c4b6",
    container: { light: "#134e48", dark: "#161f28" },
    onContainer: { light: "#87beb6", dark: "#00c4b6" },
    on: { light: "#ffffff", dark: "#0f1319" },
  },

  // Secondary (light: deep blue, dark: sky)
  secondary: {
    light: "#0051d5",
    dark: "#38bdf8",
    container: { light: "#316bf3", dark: "#1c242c" },
    on: { light: "#ffffff", dark: "#0f1319" },
  },

  // Tertiary (light: amber-brown, dark: orange)
  tertiary: {
    light: "#4b2500",
    dark: "#fb923c",
    container: { light: "#6c3800", dark: "#24201c" },
    on: { light: "#ffffff", dark: "#0f1319" },
  },

  // Surface hierarchy (light / dark)
  surface: {
    light: "#ffffff",
    dark: "#161b22",
  },
  surfaceContainerLow: {
    light: "#f2f4f6",
    dark: "#161b22",
  },
  surfaceContainer: {
    light: "#eceef0",
    dark: "#21262d",
  },
  background: {
    light: "#f7f9fb",
    dark: "#0d1117",
  },

  // Text
  onSurface: {
    light: "#191c1e",
    dark: "#f0f6fc",
  },
  onSurfaceVariant: {
    light: "#404947",
    dark: "#8b949e",
  },
  placeholder: {
    light: "#8a919d",
    dark: "#96a0ad",
  },

  // Outline/border
  outlineVariant: {
    light: "#bfc8c6",
    dark: "#21262d",
  },

  // Module identity colors
  modules: {
    dashboard: "#00c4b6",
    hrms: "#818cf8",
    attendance: "#fbbf24",
    todo: "#22c55e",
    ams: "#c084fc",
    admin: "#8b5cf6",
  },

  // Status (AMS appraisal stages)
  status: {
    due_notified: { bg: "#fefce8", text: "#a16207", border: "#fde68a" },
    reviewers_assigned: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    self_assessment_open: { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
    reviewer_rating: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
    management_review: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    meeting_pending: { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
    meeting_live: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    hike_finalisation: { bg: "#fdf2f8", text: "#be185d", border: "#f9a8d4" },
    closed: { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" },
  },
} as const;

export const radius = {
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "12px",
  "2xl": "16px",
  "3xl": "20px",
  full: "9999px",
} as const;

export const fontSize = {
  xs: "10px",
  sm: "12px",
  base: "14px",
  md: "15px",
  lg: "16px",
  xl: "18px",
  "2xl": "20px",
  "3xl": "24px",
  "4xl": "30px",
} as const;

export const shadows = {
  ambient: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  ambientHover: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  card: "0 14px 28px -24px rgba(0,0,0,0.12)",
  cardHover: "0 20px 36px -20px rgba(0,0,0,0.16)",
} as const;

export const fonts = {
  sans: "var(--font-geist-sans)",
  display: "var(--font-kiona-sans)",
  mono: "var(--font-geist-mono)",
} as const;

// Stat card tone → Tailwind classes
export const statTones = {
  teal: {
    iconBg: "bg-[#00cec4]/10",
    iconText: "text-[#00857e]",
    accent: "#00cec4",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    accent: "#3b82f6",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    accent: "#f59e0b",
  },
  violet: {
    iconBg: "bg-violet-50",
    iconText: "text-violet-600",
    accent: "#8a52ff",
  },
  green: {
    iconBg: "bg-green-50",
    iconText: "text-green-600",
    accent: "#22c55e",
  },
  slate: {
    iconBg: "bg-slate-100",
    iconText: "text-slate-500",
    accent: "#94a3b8",
  },
} as const;

export type StatTone = keyof typeof statTones;
