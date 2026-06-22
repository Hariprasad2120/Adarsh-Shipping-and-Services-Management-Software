function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getAppUrl() {
  const configured =
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configured) {
    return trimTrailingSlash(
      configured.startsWith("http") ? configured : `https://${configured}`
    );
  }

  if (process.env.VERCEL_URL) {
    return trimTrailingSlash(`https://${process.env.VERCEL_URL}`);
  }

  return "http://localhost:3000";
}
