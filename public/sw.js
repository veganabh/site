/**
 * Service Worker da Veg.ana — conservador de propósito.
 *
 * Estratégia:
 *  - Navegação (HTML de página): NETWORK-FIRST. Nunca serve página do cache se
 *    a rede responde — evita conteúdo desatualizado (cardápio/estoque/preço).
 *    Só cai pro offline.html quando o device está sem internet.
 *  - Estáticos imutáveis do Next (/_next/static), ícones e imagens: CACHE-FIRST.
 *    São versionados por hash, então cachear não causa stale.
 *  - Não cacheia API, auth, nem respostas de pagamento.
 *
 * Bump CACHE quando mudar a lista de precache.
 */
const CACHE = "vegana-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar API / auth / webhooks
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Navegação → network-first, offline.html como fallback sem rede
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Estáticos imutáveis → cache-first (versionados por hash)
  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/lottie/") ||
    url.pathname.startsWith("/sounds/");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
