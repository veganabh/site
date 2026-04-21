import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library não limpa DOM automaticamente no Vitest 4;
// sem isso, renders acumulam entre tests e queries quebram com
// "getMultipleElementsFoundError".
afterEach(() => {
  cleanup();
});
