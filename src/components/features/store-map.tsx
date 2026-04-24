"use client";

/**
 * Mapa de anéis de entrega — client-only via next/dynamic({ ssr: false }).
 *
 * CSS do Leaflet importado AQUI, não em globals.css.
 * Motivo: evitar penalizar LCP da home, catálogo e carrinho com 15KB extra.
 * Ver ADR 0006 D4.
 *
 * Quem usar mapa em rota futura deve importar leaflet/dist/leaflet.css
 * no próprio componente client, não em globals.css.
 */
import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { STORE_LOCATION } from "@/lib/store-location";
import type { DeliveryRing } from "@/types/delivery-ring";

// ─── Ícone da loja (SVG inline — sem dependência de asset externo) ─────────────

const storeIcon = L.divIcon({
  className: "vegana-store-pin",
  html: `
    <svg viewBox="0 0 24 32" width="22" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 20 8 20s8-14.5 8-20c0-4.42-3.58-8-8-8z"
            fill="var(--color-olive-900)" stroke="var(--color-paper-50)" stroke-width="1.8"/>
      <circle cx="12" cy="10" r="3" fill="var(--color-paper-50)"/>
    </svg>
  `,
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -28],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Repana o mapa quando o container redimensiona (ex: sidebar abre). */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    const container = map.getContainer();
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type StoreMapProps = {
  rings: DeliveryRing[];
  onRingClick?: (id: string) => void;
  highlightedId?: string;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function StoreMap({ rings, onRingClick, highlightedId }: StoreMapProps) {
  const center: [number, number] = [STORE_LOCATION.lat, STORE_LOCATION.lng];

  return (
    <div
      className="relative h-[400px] w-full overflow-hidden rounded-lg border border-divider md:h-[500px]"
      role="img"
      aria-label="Mapa de anéis de entrega centrado na loja Veg.ana"
    >
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <ResizeWatcher />

        {/* Tiles OpenStreetMap — atribuição obrigatória (Leaflet já inclui) */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* Marcador da loja */}
        <Marker
          position={center}
          icon={storeIcon}
          title={`${STORE_LOCATION.name} — ${STORE_LOCATION.street} ${STORE_LOCATION.number}`}
        />

        {/* Anéis concêntricos — ativos = stroke forte sem fill, inativos = stroke
         * tracejado fraco. Fill só no anel em highlight (clareza visual máxima,
         * sem empilhamento cumulativo de transparência). */}
        {rings.map((ring) => {
          const isHighlighted = ring.id === highlightedId;

          if (ring.active) {
            return (
              <Circle
                key={ring.id}
                center={center}
                radius={ring.outerRadiusM}
                pathOptions={{
                  fill: isHighlighted,
                  fillColor: "var(--color-olive-900)",
                  fillOpacity: isHighlighted ? 0.18 : 0,
                  color: "var(--color-olive-900)",
                  weight: isHighlighted ? 2.5 : 1.25,
                  opacity: isHighlighted ? 1 : 0.55,
                }}
                eventHandlers={{
                  click: () => onRingClick?.(ring.id),
                }}
                aria-label={`Anel ${ring.order}: ${ring.label}`}
              />
            );
          }

          return (
            <Circle
              key={ring.id}
              center={center}
              radius={ring.outerRadiusM}
              pathOptions={{
                fill: false,
                color: "var(--color-olive-700)",
                weight: 1,
                opacity: 0.28,
                dashArray: "3 5",
              }}
              eventHandlers={{
                click: () => onRingClick?.(ring.id),
              }}
              aria-label={`Anel ${ring.order} (inativo): ${ring.label}`}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
