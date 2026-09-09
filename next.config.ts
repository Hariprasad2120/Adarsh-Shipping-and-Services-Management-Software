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

    // Escape hatch: on a badly contended Windows box `next build`'s per-CPU
    // worker fan-out (page-data + static generation) can race Defender's
    // on-write scan and throw EPERM opening a freshly written server chunk.
    // Not needed by default (see serverExternalPackages: "xlsx" below, which
    // removed the deterministic trigger), but `NEXT_BUILD_CPUS=<n>` caps the
    // pool if a machine still hits it.
    ...(process.env.NEXT_BUILD_CPUS
      ? { cpus: Number(process.env.NEXT_BUILD_CPUS) }
      : {}),

    // Server Action body size limit (covers file uploads sent via FormData,
    // e.g. CHA document uploads). Next.js default is 1mb.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Keep heavy Node-only libraries out of the turbopack server bundle and load
  // them from node_modules at runtime instead.
  //  - @prisma/client / bcryptjs: native / generated code that must not be
  //    re-bundled into Edge/client chunks.
  //  - xlsx (SheetJS): a large parser whose minified source reliably trips
  //    Windows Defender's heuristic scanner when inlined into a generated
  //    `.next/server/chunks/*` file — Defender then denies read access to that
  //    one chunk and `next build` dies with `EPERM … Failed to collect page
  //    data` for whichever route pulled it in (here /cha/masters/[key]/download
  //    via the customs-master service). Externalizing it removes the inlined
  //    copy; the runtime code path and the safe-xlsx wrapper are unchanged.
  serverExternalPackages: ["@prisma/client", "bcryptjs", "xlsx"],
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

  // The Content-Security-Policy (with a per-request nonce) and HSTS are set in
  // src/proxy.ts, which runs on every HTML route. Here we keep only the static,
  // nonce-free fallback headers for asset / non-proxied responses, plus the
  // API cache header.
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const common = [
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
