// ─── Google Chat root endpoint ────────────────────────────────────────────────
// Google Cloud Console is configured to send events here.
// Delegates to the full webhook handler.
export { POST } from "./webhook/route";
