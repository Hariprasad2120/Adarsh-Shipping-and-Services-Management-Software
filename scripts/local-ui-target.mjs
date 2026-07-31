export const LOCAL_UI_BASE_URL = "http://localhost:3000";

export function getLocalUiBaseUrl(configuredUrl = process.env.UI_TEST_BASE_URL) {
  const candidate = configuredUrl || LOCAL_UI_BASE_URL;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `UI verification requires ${LOCAL_UI_BASE_URL}; the configured URL is invalid.`,
    );
  }

  if (
    parsed.origin !== LOCAL_UI_BASE_URL ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `UI verification is restricted to ${LOCAL_UI_BASE_URL}. Start npm run dev and do not launch a second Monolith server.`,
    );
  }

  return LOCAL_UI_BASE_URL;
}

export async function assertLocalUiServerReady(
  baseUrl = getLocalUiBaseUrl(),
) {
  try {
    const response = await fetch(`${baseUrl}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status >= 500) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : "";
    throw new Error(
      `The Monolith application is not ready at ${LOCAL_UI_BASE_URL}${detail}. Run npm run dev first; UI tests never start another server.`,
    );
  }
}
