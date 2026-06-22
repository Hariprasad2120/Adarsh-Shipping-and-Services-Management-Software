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
        // All API routes — prevent caching of authenticated responses
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
