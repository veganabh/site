import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library não limpa DOM automaticamente no Vitest 4;
// sem isso, renders acumulam entre tests e queries quebram com
// "getMultipleElementsFoundError".
afterEach(() => {
  cleanup();
});

// jsdom não resolve URLs relativas em fetch (LeafLoaderAnimation carrega
// /lottie/*.json em useEffect). Stub global devolve JSON vazio.
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.startsWith("/lottie/")) {
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return originalFetch(input, init);
}) as typeof fetch;
vi.stubGlobal("fetch", globalThis.fetch);

// lottie-web requer canvas real; jsdom devolve null e quebra em import.
// Mock substitui componente por <div/> inerte.
vi.mock("lottie-react", () => ({
  default: () => null,
}));
