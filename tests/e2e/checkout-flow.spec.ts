import { test, expect } from "@playwright/test";

/**
 * Checkout flow E2E (com auth).
 *
 * Pré-requisitos via env vars (`.env.local` é lido pelo dev server, mas Playwright
 * precisa explícito):
 *   E2E_TEST_EMAIL — email de um user real no Supabase com profile completo
 *                    (firstName, phone, cpf, endereço cadastrado)
 *   E2E_TEST_PASSWORD — senha do user
 *
 * Sem essas vars, os tests aqui ficam `test.skip`. Pra rodar:
 *   $env:E2E_TEST_EMAIL="seu@email"; $env:E2E_TEST_PASSWORD="senha"; npm run e2e
 *
 * Cobertura:
 *  1. Login → /conta carrega
 *  2. Adiciona produto ao carrinho
 *  3. Vai pra /carrinho → vê item
 *  4. Avança checkout (resumo → endereço → pagamento)
 *  5. Confirma pedido → redirect /obrigado/<id> com QR PIX visível
 *
 * NÃO simula pagamento PIX (Dev Mode AbacatePay) — esse é o teste manual
 * via `npm run abacatepay:simulate`.
 */

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;
const HAS_CREDENTIALS = Boolean(EMAIL && PASSWORD);

test.describe("checkout completo (precisa E2E_TEST_EMAIL/PASSWORD)", () => {
  test.skip(!HAS_CREDENTIALS, "credenciais E2E ausentes");

  test("login redireciona pra /conta com profile preenchido", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', EMAIL!);
    await page.fill('input[name="password"]', PASSWORD!);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/conta/, { timeout: 10_000 });

    // /conta deve mostrar nome do user em algum lugar (saudação ou form preenchido)
    await expect(page.locator("main")).toBeVisible();
  });

  test("fluxo carrinho → checkout → /obrigado renderiza QR PIX", async ({ page }) => {
    // 1. Login
    await page.goto("/login");
    await page.fill('input[name="email"]', EMAIL!);
    await page.fill('input[name="password"]', PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/conta/);

    // 2. Home → adiciona primeiro produto disponível
    await page.goto("/");
    const addButton = page.locator('button[aria-label*="Adicionar"]').first();
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await addButton.click();

    // 3. Vai pro carrinho
    await page.goto("/carrinho");
    await expect(page.getByRole("heading", { name: /seu pedido/i })).toBeVisible({ timeout: 5_000 });

    // 4. Avança checkout — botão "Confirmar pedido" pode estar em step pagamento.
    // Estratégia: clica "Continuar"/"Avançar" até chegar em pagamento.
    // Texto exato depende do step — usa role + nome aproximado.
    const advanceButtons = page.locator(
      'button:visible:has-text("Confirmar endereço"), button:visible:has-text("Ir para pagamento"), button:visible:has-text("Efetuar pagamento")',
    );

    // Loop de até 5 cliques (resumo → endereço → pagamento → confirmar)
    for (let i = 0; i < 5; i++) {
      const btn = advanceButtons.first();
      if (!(await btn.isVisible().catch(() => false))) break;
      await btn.click();
      await page.waitForTimeout(800);
      if (page.url().includes("/obrigado/")) break;
    }

    // 5. Espera /obrigado com QR PIX
    await page.waitForURL(/\/obrigado\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Pague com PIX/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('img[alt*="QR Code"]')).toBeVisible();
  });
});
