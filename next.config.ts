import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  distDir: process.env.MONOLITH_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["192.168.1.33"],

  experimental: {
    // Tree-shakes icon/motion packages so only the symbols actually imported
    // are included in each page bundle. lucide-react ships 1400+ icons; without
    // this the entire library ends up in the JS bundle.
    optimizePackageImports: ["lucide-react", "framer-motion", "@carbon/icons-react"],

    // Server Action body size limit (covers file uploads sent via FormData,
    // e.g. CHA document uploads). Next.js default is 1mb.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Suppress Prisma from being bundled into Edge/client chunks.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  turbopack: {},

  // The reference and legacy backup trees are intentionally retained for the
  // UI migration, but they are never runtime dependencies. Keep the diagnostic
  // Webpack fallback from watching those expanded archives.
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/OLD UI code/**",
          "**/_design-reference/**",
          "**/artifacts/**",
          "**/scrap/**",
          "**/scratch/**",
        ],
      };
    }
    return config;
  },

  // Global security & cache headers. Per-response headers for authenticated
  // paths (incl. HSTS gating on TLS) are additionally set in src/proxy.ts;
  // the CSP string below is kept in sync with src/lib/security-headers.ts
  // (CONTENT_SECURITY_POLICY, production variant) by a unit test.
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'self' blob:",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      isProd
        ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    const common = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ...(isProd
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]
        : []),
    ];

    return [
      { source: "/:path*", headers: common },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
