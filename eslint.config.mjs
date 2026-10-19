import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// `next lint` was removed in Next.js 16; run `npm run lint` (ESLint CLI, flat config).
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `_name` marks an intentionally unused binding; omitting a key via rest
      // destructuring (`const { a, ...rest } = obj`) is not a leftover.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "release/**",
    "electron/**",
    "next-env.d.ts",
  ]),
]);
