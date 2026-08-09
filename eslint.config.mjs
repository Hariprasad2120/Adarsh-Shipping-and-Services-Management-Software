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
  {
    // Advisory only (warn, not error) — this codebase has legitimate raw-element
    // usages (custom nav rails, tab strips, mnx-plain triggers) that intentionally
    // bypass the shared component layer. Use eslint-disable-next-line with a reason
    // for those. This rule exists to surface NEW unmanaged UI as it's written, not
    // to block builds (no CI runs lint in this repo today).
    files: ["src/app/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    ignores: ["src/components/dev-console/**"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            "Use <Button> from @/components/ui/button instead of a raw <button>, unless this is an intentional custom widget (add eslint-disable-next-line with a reason).",
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message:
            "Use <Input> from @/components/ui/input instead of a raw <input>, unless this is an intentional custom widget (add eslint-disable-next-line with a reason).",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Use <NativeSelect>/<DropdownSelect> from @/components/ui instead of a raw <select>, unless this is an intentional custom widget (add eslint-disable-next-line with a reason).",
        },
        {
          selector:
            "JSXAttribute[name.name='style'] Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            "Avoid hardcoded hex colors in inline styles — use a var(--frappe-*)/var(--mn-*) design token instead.",
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
