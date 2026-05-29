import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees do Claude (cópias stale) não entram no lint.
    ".claude/**",
  ]),
  // Anti-mock rule — mocks de domínio só vivem em src/__fixtures__/ ou
  // scripts/ (seed). Importar de outros lugares é red flag — código de
  // produção deve usar reader Supabase + store hidratada.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/__fixtures__/**",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/mock-*", "@/lib/mock-*", "@/__fixtures__/*"],
              message:
                "Mocks/fixtures não podem ser importados em código de produção. Use reader Supabase em src/server/ + store hidratada. Fixtures são consumidas só em scripts/seed-*.ts.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
