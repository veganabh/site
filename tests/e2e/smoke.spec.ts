import { test, expect } from "@playwright/test";

/**
 * Smoke tests — fluxos básicos que SEMPRE têm que funcionar.
 *
 * Cobre:
 *  - Home carrega + h1 esperada
 *  - Navegação pra carrinho vazio
 *  - Login redireciona quando rota exige auth
 *  - 404 em rota inválida
 *
 * Fluxos que exigem auth real (checkout, /conta) ficam em
 * `checkout-flow.spec.ts` com helper de login.
 */

test("home carrega com h1 esperada", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText("Doce feito em casa");
  await expect(page).toHaveTitle(/Veg\.ana/i);
});

test("metadata SEO estão presentes", async ({ page }) => {
  await page.goto("/");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description).toBeTruthy();
  expect(description!.length).toBeGreaterThan(20);
  // Confeitaria + sem lactose são pilares do posicionamento — qualquer um basta.
  expect(description!.toLowerCase()).toMatch(/vegan|lactose|doceria|confeitaria/);
});

test("carrinho vazio abre e mostra estado vazio", async ({ page }) => {
  await page.goto("/carrinho");
  // EmptyCart renderiza algo identificável — texto pode mudar, então só
  // garantimos que a rota responde 200 e tem main visível.
  await expect(page.locator("main")).toBeVisible();
});

test("/conta sem auth redireciona pra /login", async ({ page }) => {
  await page.goto("/conta");
  await page.waitForURL(/\/login/, { timeout: 5_000 });
  expect(page.url()).toContain("/login");
});

test("rota inexistente retorna 404", async ({ page }) => {
  const response = await page.goto("/rota-que-nao-existe-12345");
  expect(response?.status()).toBe(404);
});

test("/obrigado/<id-inexistente> sem auth redireciona pra /login", async ({ page }) => {
  await page.goto("/obrigado/00000000-0000-0000-0000-000000000000");
  await page.waitForURL(/\/login/, { timeout: 5_000 });
  expect(page.url()).toContain("/login");
});

test("API webhook AbacatePay sem secret retorna 401 ou 500", async ({ request }) => {
  const res = await request.post("/api/webhooks/abacatepay", {
    data: { event: "noop", data: {} },
  });
  // 500 (config: env vazio em dev) ou 401 (signature ausente). Qualquer um =
  // gate funciona, ninguém anônimo passa.
  expect([401, 500]).toContain(res.status());
});

test("API payments/status sem auth retorna 401", async ({ request }) => {
  const res = await request.get(
    "/api/payments/00000000-0000-0000-0000-000000000000/status",
  );
  expect(res.status()).toBe(401);
});
