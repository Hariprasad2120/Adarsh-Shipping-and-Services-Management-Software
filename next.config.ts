import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  experimental: {
    // Tree-shakes icon/motion packages so only the symbols actually imported
    // are included in each page bundle. lucide-react ships 1400+ icons; without
    // this the entire library ends up in the JS bundle.
    optimizePackageImports: ["lucide-react", "framer-motion", "@carbon/icons-react"],
  },

  // Suppress Prisma from being bundled into Edge/client chunks.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  // Security & cache headers for authenticated API routes.
  // Dashboard page headers are handled by the middleware.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss:; worker-src 'self' blob:;" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
