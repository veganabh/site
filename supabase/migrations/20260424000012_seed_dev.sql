-- Migration 12 — Seed dev (ADR 0008 D19)
-- Atenção: rodar SOMENTE em dev/staging. Em produção, produtos são cadastrados
-- pela dona via painel admin ou importados de planilha (Open Question 7).
--
-- Este seed é placeholder. Extração fiel das fixtures
-- (src/__fixtures__/products.ts + mock-coupons + mock-gift-kits) é feita
-- pelos scripts `npm run seed:products|coupons|gift-kits`, que populam o DB
-- via UPSERT por slug com idempotência.
--
-- Manter vazio aqui evita risco de aplicar dados fictícios em prod por engano.

-- Exemplo de produto placeholder (apague antes de go-live):
-- INSERT INTO public.products (slug, name, description, category, gramatura_g, price_site_cents, price_ifood_cents, photo_url, active, stock)
-- VALUES ('exemplo', 'Produto exemplo', 'Descrição', 'bolo-no-pote', 250, 2500, 2900, 'https://placehold.co/600x600', true, 10)
-- ON CONFLICT DO NOTHING;

SELECT 1;
