import type { LoginSceneState, LoginSceneStatus } from "./login-scene.types";

export const SUCCESS_TRANSITION_MS = 1050;
export const DEFAULT_CALLBACK_URL = "/dashboard";

const STATUS_COPY: Record<LoginSceneState, LoginSceneStatus> = {
  idle: { eyebrow: "LIVE OPERATIONS", title: "Port systems ready" },
  userIdFocused: { eyebrow: "VESSEL IDENTIFICATION", title: "Vessel identification initiated" },
  userIdTyping: { eyebrow: "VESSEL IDENTIFICATION", title: "Manifest route synchronising" },
  passwordFocused: { eyebrow: "SECURE CHECKPOINT", title: "Secure checkpoint active" },
  passwordTyping: { eyebrow: "SECURE CHECKPOINT", title: "Credentials under verification" },
  authenticating: { eyebrow: "CLEARANCE CONTROL", title: "Verifying shipment clearance" },
  success: { eyebrow: "DISPATCH CONFIRMED", title: "Cleared for dispatch" },
  failure: { eyebrow: "CLEARANCE BLOCKED", title: "Shipment failed to load" },
};

export function getLoginSceneStatus(state: LoginSceneState) {
  return STATUS_COPY[state];
}

export function clampLoginProgress(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
