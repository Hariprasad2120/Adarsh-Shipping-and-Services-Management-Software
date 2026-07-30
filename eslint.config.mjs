import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/modules/**"],
              message:
                "Canonical UI primitives cannot depend on routes or feature modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/components/data-display/**/*.{ts,tsx}",
      "src/components/feedback/**/*.{ts,tsx}",
      "src/components/forms/**/*.{ts,tsx}",
      "src/components/layout/**/*.{ts,tsx}",
      "src/components/navigation/**/*.{ts,tsx}",
      "src/components/providers/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**"],
              message: "Shared components cannot depend on route implementations.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**"],
              message: "Feature modules cannot depend on route implementations.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".monolith-staging/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "OLD UI code/**",
    "_design-reference/**",
    "Adarsh-Shipping-and-Services-Management-Software/**",
    "artifacts/**",
    "scrap/**",
    "scratch/**",
  ]),
]);

export default eslintConfig;
