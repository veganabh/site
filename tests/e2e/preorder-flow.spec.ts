import { test, expect } from "@playwright/test";

/**
 * Encomenda (preorder) flow E2E — wizard /encomendas/finalizar.
 *
 * Espelha o checkout-flow.spec, mas pro fluxo de encomenda: Resumo → Entrega
 * (agendamento + endereço) → Pagamento → /obrigado com QR PIX.
 *
 * Pré-requisitos (env vars — mesmas do checkout-flow):
 *   E2E_TEST_EMAIL / E2E_TEST_PASSWORD — user real no Supabase com profile
 *   completo (firstName, phone, cpf). Sem isso, `test.skip`.
 *
 * Pra rodar:
 *   $env:E2E_TEST_EMAIL="seu@email"; $env:E2E_TEST_PASSWORD="senha"; npm run e2e
 *
 * Pré-condição de dados: precisa existir ao menos 1 produto com
 * `available_for_preorder = true` no cardápio de encomendas.
 *
 * NÃO simula pagamento PIX (Dev Mode AbacatePay) — settlement é teste manual.
 */

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;
const HAS_CREDENTIALS = Boolean(EMAIL && PASSWORD);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', EMAIL!);
  await page.fill('input[name="password"]', PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/conta/, { timeout: 10_000 });
}

test.describe("encomenda completa (precisa E2E_TEST_EMAIL/PASSWORD)", () => {
  test.skip(!HAS_CREDENTIALS, "credenciais E2E ausentes");

  test("wizard de encomenda: resumo → entrega → pagamento → /obrigado", async ({ page }) => {
    await login(page);

    // 1. Vai pra aba de encomendas e adiciona o primeiro produto apto
    await page.goto("/encomendas");
    const addButton = page
      .locator('button:has-text("Encomendar"), button[aria-label*="Encomendar"]')
      .first();
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await addButton.click();

    // 2. Abre o checkout do carrinho de encomenda
    await page.goto("/encomendas/finalizar");

    // Passo 1 — Resumo: avança pra entrega
    const escolherEntrega = page.locator('button:visible:has-text("Escolher entrega")').first();
    await expect(escolherEntrega).toBeVisible({ timeout: 10_000 });
    await escolherEntrega.click();

    // Passo 2 — Entrega: preenche endereço (data/hora já têm default)
    await page.fill('input[id="preorder-street"]', "Rua das Acácias");
    await page.fill('input[id="preorder-number"]', "100");
    await page.fill('input[id="preorder-neighborhood"]', "Savassi");
    await page.fill('input[id="preorder-cep"]', "30140-071");
    await page.locator('button:visible:has-text("Ir para pagamento")').first().click();

    // Passo 3 — Pagamento (PIX é default) → confirma
    const confirmar = page.locator('button:visible:has-text("Confirmar encomenda")').first();
    await expect(confirmar).toBeVisible({ timeout: 10_000 });
    await confirmar.click();

    // 3. Espera /obrigado com QR PIX
    await page.waitForURL(/\/obrigado\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Pague com PIX/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
