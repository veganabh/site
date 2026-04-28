import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — smoke tests E2E do site Veg.ana.
 *
 * Roda em http://localhost:3100 (porta dedicada do projeto). Reusa server
 * existente em dev se já estiver up; sobe `npm run dev` em CI.
 *
 * Browsers: chromium only (mobile + desktop). Firefox/Safari em backlog —
 * Veg.ana é BH, ~95% chrome/edge/safari mobile.
 *
 * Convenções:
 * - Tests em `tests/e2e/*.spec.ts`
 * - Auth helper compartilhado: `tests/e2e/helpers/auth.ts`
 * - Não commitar `.env.test` — credenciais de teste em variáveis de ambiente.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      // iPhone 13 default usa WebKit. Pra rodar com chromium engine
      // (Chrome Android), usa Pixel 5.
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
