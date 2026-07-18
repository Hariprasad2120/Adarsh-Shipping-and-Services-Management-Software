const IS_PROD = process.env.NODE_ENV === "production";

export const PORTAL_COOKIE_NAME = IS_PROD
  ? "__Host-monolith.customer-portal-session"
  : "monolith.dev.customer-portal-session";

export const PORTAL_LOGIN_PATH = "/customer-portal/login";
