"use client";

import { create } from "zustand";
import { geocode, fallbackQuoteByPrefix, GeocodeError } from "@/lib/geocode";
import { useRingsStore } from "@/stores/rings-store";

/**
 * Representa a consulta de entrega feita pelo usuário.
 * Fonte de verdade: geocodagem Nominatim → rings-store (lookup por lat/lng).
 * Fallback offline: CEP-prefix quando Nominatim indisponível.
 */
export type DeliveryQuote = {
  cep: string;
  neighborhood: string;
  city: string;
  /** ETA formatada. Ex: "25–35 min". Vazio se fora de área. */
  eta: string;
  shippingFee: number;
  /** Se está dentro de algum anel ativo. */
  covered: boolean;
  /**
   * true quando quote veio do fallback CEP-prefix (Nominatim indisponível).
   * Exibir aviso ao usuário: "Estimativa — conexão com mapa indisponível."
   */
  estimate?: boolean;
};

type DeliveryStore = {
  quote: DeliveryQuote | null;
  loading: boolean;
  /** Async. Retorna null se CEP inválido (< 8 dígitos). Persiste quote no store. */
  setCep: (cep: string, number?: string) => Promise<DeliveryQuote | null>;
  /**
   * Geocoda + lookup sem persistir no store — usado para validar CEP de
   * destinatário de presente sem sobrescrever a quote do próprio cliente.
   */
  lookupCep: (cep: string, number?: string) => Promise<DeliveryQuote | null>;
  clear: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeCep(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

function formatCep(digits: string): string {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDeliveryStore = create<DeliveryStore>((set) => ({
  quote: null,
  loading: false,

  async setCep(cep, number?) {
    const digits = sanitizeCep(cep);
    if (digits.length !== 8) return null;

    set({ loading: true });

    try {
      // 1. Geocodar via Nominatim
      const geo = await geocode(digits, number);

      // 2. Lookup no rings-store
      const ring = useRingsStore.getState().lookupByLatLng(geo.lat, geo.lng);

      let quote: DeliveryQuote;

      if (!ring) {
        quote = {
          cep: formatCep(digits),
          neighborhood: geo.neighborhood ?? "",
          city: geo.city ?? "",
          eta: "",
          shippingFee: 0,
          covered: false,
        };
      } else {
        quote = {
          cep: formatCep(digits),
          neighborhood: geo.neighborhood ?? "",
          city: geo.city ?? "Belo Horizonte",
          eta: `${ring.etaMin}–${ring.etaMax} min`,
          shippingFee: ring.fee,
          covered: true,
        };
      }

      set({ quote, loading: false });
      return quote;
    } catch (err) {
      // Geocode falhou — tentar fallback CEP-prefix
      const isNetworkError =
        err instanceof GeocodeError || (err instanceof Error && err.message.includes("network"));

      if (isNetworkError) {
        const fb = fallbackQuoteByPrefix(digits);
        const quote: DeliveryQuote = {
          cep: formatCep(digits),
          neighborhood: fb.neighborhood,
          city: fb.city,
          eta: fb.covered ? `${fb.etaMin}–${fb.etaMax} min` : "",
          shippingFee: fb.shippingFee,
          covered: fb.covered,
          estimate: true,
        };

        set({ quote, loading: false });

        // Retry silencioso em 30s
        setTimeout(() => {
          useDeliveryStore
            .getState()
            .setCep(digits, number)
            .catch(() => {
              // silencioso
            });
        }, 30_000);

        return quote;
      }

      set({ loading: false });
      return null;
    }
  },

  async lookupCep(cep, number?) {
    const digits = sanitizeCep(cep);
    if (digits.length !== 8) return null;

    try {
      const geo = await geocode(digits, number);
      const ring = useRingsStore.getState().lookupByLatLng(geo.lat, geo.lng);

      if (!ring) {
        return {
          cep: formatCep(digits),
          neighborhood: geo.neighborhood ?? "",
          city: geo.city ?? "",
          eta: "",
          shippingFee: 0,
          covered: false,
        };
      }

      return {
        cep: formatCep(digits),
        neighborhood: geo.neighborhood ?? "",
        city: geo.city ?? "Belo Horizonte",
        eta: `${ring.etaMin}–${ring.etaMax} min`,
        shippingFee: ring.fee,
        covered: true,
      };
    } catch (err) {
      const isNetworkError =
        err instanceof GeocodeError || (err instanceof Error && err.message.includes("network"));

      if (isNetworkError) {
        const fb = fallbackQuoteByPrefix(digits);
        return {
          cep: formatCep(digits),
          neighborhood: fb.neighborhood,
          city: fb.city,
          eta: fb.covered ? `${fb.etaMin}–${fb.etaMax} min` : "",
          shippingFee: fb.shippingFee,
          covered: fb.covered,
          estimate: true,
        };
      }

      return null;
    }
  },

  clear() {
    set({ quote: null, loading: false });
  },
}));
