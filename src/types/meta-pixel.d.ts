/**
 * Tipos globais do Meta Pixel (fbevents.js).
 *
 * `fbq` é injetado pelo base code carregado em `meta-pixel-provider.tsx`.
 * Antes do script carregar, `fbq` é um stub que enfileira chamadas.
 */
interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: Fbq;
}

interface Window {
  fbq?: Fbq;
  _fbq?: Fbq;
}
