"use client";

/**
 * Wrapper Nominatim para geocodagem de CEPs brasileiros.
 *
 * Política de uso respeitada:
 * - User-Agent identificável obrigatório (sem isso Nominatim bloqueia)
 * - Máximo 1 req/s — queue FIFO com min-gap de 1100ms
 * - Cache localStorage 30 dias — hits não entram na fila
 *
 * Degradação: se Nominatim falhar, o consumer recebe um GeocodeError
 * e deve acionar fallbackQuoteByPrefix().
 */

const USER_AGENT = "Veg.ana-Admin/1.0 (grupoaccellera@gmail.com)";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type GeocodeResult = {
  lat: number;
  lng: number;
  neighborhood?: string;
  city?: string;
};

export type ReverseResult = {
  neighborhood?: string;
  city?: string;
};

export class GeocodeError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GeocodeError";
  }
}

// ─── Cache localStorage ───────────────────────────────────────────────────────

type CacheEntry<T> = { data: T; expiresAt: number };

function cacheGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage cheio — ignora silenciosamente
  }
}

// ─── Queue FIFO singleton (min-gap 1100ms) ────────────────────────────────────

const MIN_GAP_MS = 1100;
let lastRequestAt = 0;
const queue: Array<() => void> = [];
let processingQueue = false;

function enqueue(fn: () => void): void {
  queue.push(fn);
  if (!processingQueue) drainQueue();
}

function drainQueue(): void {
  processingQueue = true;
  const next = queue.shift();
  if (!next) {
    processingQueue = false;
    return;
  }
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - now);
  setTimeout(() => {
    lastRequestAt = Date.now();
    next();
    drainQueue();
  }, wait);
}

// ─── Fetch com fila ───────────────────────────────────────────────────────────

async function fetchWithQueue(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    enqueue(async () => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
        });
        if (!res.ok) {
          reject(new GeocodeError(`Nominatim HTTP ${res.status}`, res.status));
          return;
        }
        const json: unknown = await res.json();
        resolve(json);
      } catch (err) {
        reject(new GeocodeError(err instanceof Error ? err.message : "network error"));
      }
    });
  });
}

// ─── geocode ─────────────────────────────────────────────────────────────────

/**
 * Converte CEP (+ número opcional) em coordenadas geográficas.
 * Tenta endereço completo; se não encontrar, tenta só o CEP.
 */
export async function geocode(cep: string, number?: string): Promise<GeocodeResult> {
  const sanitizedCep = cep.replace(/\D/g, "");
  const cacheKey = `geocode:${sanitizedCep}-${number ?? ""}`;

  const cached = cacheGet<GeocodeResult>(cacheKey);
  if (cached) return cached;

  // Tenta primeiro com número, depois sem
  const queries = number
    ? [
        `${NOMINATIM_BASE}/search?postalcode=${sanitizedCep}&street=${encodeURIComponent(number)}&country=BR&format=json&limit=1&addressdetails=1`,
        `${NOMINATIM_BASE}/search?postalcode=${sanitizedCep}&country=BR&format=json&limit=1&addressdetails=1`,
      ]
    : [
        `${NOMINATIM_BASE}/search?postalcode=${sanitizedCep}&country=BR&format=json&limit=1&addressdetails=1`,
      ];

  let lastError: GeocodeError | null = null;

  for (const url of queries) {
    try {
      const results = (await fetchWithQueue(url)) as NominatimResult[];
      if (results.length > 0) {
        const r = results[0];
        const result: GeocodeResult = {
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          neighborhood:
            r.address?.suburb ?? r.address?.neighbourhood ?? r.address?.city_district ?? undefined,
          city: r.address?.city ?? r.address?.town ?? undefined,
        };
        cacheSet(cacheKey, result);
        return result;
      }
    } catch (err) {
      lastError = err instanceof GeocodeError ? err : new GeocodeError(String(err));
    }
  }

  if (lastError) throw lastError;
  throw new GeocodeError(`Nenhum resultado para CEP ${cep}`);
}

// ─── reverseGeocode ───────────────────────────────────────────────────────────

/**
 * Converte coordenadas em dados de bairro/cidade.
 * Lat/lng arredondados a 4 casas decimais para cache eficiente.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult> {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  const cacheKey = `reverse:${roundedLat},${roundedLng}`;

  const cached = cacheGet<ReverseResult>(cacheKey);
  if (cached) return cached;

  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  const raw = (await fetchWithQueue(url)) as NominatimReverseResult;
  const result: ReverseResult = {
    neighborhood:
      raw.address?.suburb ?? raw.address?.neighbourhood ?? raw.address?.city_district ?? undefined,
    city: raw.address?.city ?? raw.address?.town ?? undefined,
  };

  cacheSet(cacheKey, result);
  return result;
}

// ─── Fallback CEP-prefix (offline / degradado) ────────────────────────────────

/**
 * Fallback quando Nominatim está indisponível.
 * Porta a lógica do delivery-store.ts legado — mapeamento por prefixo de CEP.
 * Retorna null se o CEP claramente não é de BH.
 */
export type FallbackQuote = {
  neighborhood: string;
  city: string;
  shippingFee: number;
  etaMin: number;
  etaMax: number;
  covered: boolean;
};

const BH_COVERED_PREFIXES = new Set([
  "301",
  "302",
  "303",
  "304",
  "305",
  "306",
  "307",
  "308",
  "310",
  "311",
  "312",
  "313",
  "314",
  "315",
  "316",
  "317",
  "318",
  "319",
]);

const NEIGHBORHOOD_BY_PREFIX: Record<string, string> = {
  "301": "Centro",
  "302": "Santa Efigênia",
  "303": "Cidade Nova",
  "304": "Floresta",
  "305": "Padre Eustáquio",
  "306": "Prado",
  "307": "Barreiro",
  "308": "Gutierrez",
  "310": "Anchieta",
  "311": "Funcionários",
  "312": "Savassi",
  "313": "Sion",
  "314": "Cidade Jardim",
  "315": "Serra",
  "316": "Belvedere",
  "317": "Mangabeiras",
  "318": "São Bento",
  "319": "Buritis",
};

const ETA_BY_PREFIX: Record<string, { etaMin: number; etaMax: number; fee: number }> = {
  "301": { fee: 5, etaMin: 35, etaMax: 45 },
  "302": { fee: 5, etaMin: 30, etaMax: 40 },
  "303": { fee: 5, etaMin: 35, etaMax: 45 },
  "304": { fee: 5, etaMin: 30, etaMax: 40 },
  "305": { fee: 5, etaMin: 45, etaMax: 55 },
  "306": { fee: 5, etaMin: 50, etaMax: 60 },
  "307": { fee: 7, etaMin: 60, etaMax: 75 },
  "308": { fee: 5, etaMin: 40, etaMax: 50 },
  "310": { fee: 5, etaMin: 35, etaMax: 45 },
  "311": { fee: 0, etaMin: 25, etaMax: 35 },
  "312": { fee: 0, etaMin: 20, etaMax: 30 },
  "313": { fee: 0, etaMin: 25, etaMax: 35 },
  "314": { fee: 5, etaMin: 35, etaMax: 45 },
  "315": { fee: 5, etaMin: 40, etaMax: 50 },
  "316": { fee: 7, etaMin: 55, etaMax: 70 },
  "317": { fee: 7, etaMin: 55, etaMax: 70 },
  "318": { fee: 5, etaMin: 30, etaMax: 40 },
  "319": { fee: 5, etaMin: 50, etaMax: 65 },
};

export function fallbackQuoteByPrefix(cep: string): FallbackQuote {
  const digits = cep.replace(/\D/g, "");
  const prefix = digits.slice(0, 3);
  const covered = BH_COVERED_PREFIXES.has(prefix);

  if (!covered) {
    return { neighborhood: "", city: "", shippingFee: 0, etaMin: 0, etaMax: 0, covered: false };
  }

  const eta = ETA_BY_PREFIX[prefix] ?? { fee: 5, etaMin: 40, etaMax: 60 };
  return {
    neighborhood: NEIGHBORHOOD_BY_PREFIX[prefix] ?? "Belo Horizonte",
    city: "Belo Horizonte",
    shippingFee: eta.fee,
    etaMin: eta.etaMin,
    etaMax: eta.etaMax,
    covered: true,
  };
}

// ─── Tipos internos Nominatim ─────────────────────────────────────────────────

type NominatimAddress = {
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  city?: string;
  town?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

type NominatimReverseResult = {
  address?: NominatimAddress;
};
