import { describe, it, expect } from "vitest";
import { isComingSoonEnabled, shouldRedirectToComingSoon, COMING_SOON_PATH } from "./coming-soon";

describe("isComingSoonEnabled", () => {
  it("liga só com a string 'on'", () => {
    expect(isComingSoonEnabled("on")).toBe(true);
    expect(isComingSoonEnabled("off")).toBe(false);
    expect(isComingSoonEnabled("true")).toBe(false);
    expect(isComingSoonEnabled(undefined)).toBe(false);
    expect(isComingSoonEnabled("")).toBe(false);
  });
});

describe("shouldRedirectToComingSoon", () => {
  it("bloqueia rotas públicas", () => {
    expect(shouldRedirectToComingSoon("/")).toBe(true);
    expect(shouldRedirectToComingSoon("/cardapio")).toBe(true);
    expect(shouldRedirectToComingSoon("/carrinho")).toBe(true);
    expect(shouldRedirectToComingSoon("/presentear")).toBe(true);
    expect(shouldRedirectToComingSoon("/presentear/kit-anfitria")).toBe(true);
  });

  it("libera gestão, auth, api, conta", () => {
    expect(shouldRedirectToComingSoon("/gestao")).toBe(false);
    expect(shouldRedirectToComingSoon("/gestao/pedidos")).toBe(false);
    expect(shouldRedirectToComingSoon("/login")).toBe(false);
    expect(shouldRedirectToComingSoon("/cadastro")).toBe(false);
    expect(shouldRedirectToComingSoon("/api/notifications")).toBe(false);
    expect(shouldRedirectToComingSoon("/conta")).toBe(false);
    expect(shouldRedirectToComingSoon("/conta/perfil")).toBe(false);
  });

  it("não redireciona a própria /em-breve (evita loop)", () => {
    expect(shouldRedirectToComingSoon(COMING_SOON_PATH)).toBe(false);
  });

  it("não trata prefixo parcial como permitido", () => {
    // "/gestaozinho" NÃO deve passar só porque começa com "/gestao"
    expect(shouldRedirectToComingSoon("/gestaozinho")).toBe(true);
    expect(shouldRedirectToComingSoon("/contato")).toBe(true); // não é /conta
  });
});
