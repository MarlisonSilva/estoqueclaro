import { describe, expect, it } from "vitest";
import { emailPermitido } from "./emails";

describe("emailPermitido", () => {
  it("aceita e-mail da lista, sem diferenciar maiúsculas nem espaços", () => {
    expect(emailPermitido(" Gestor@Loja.com ", "a@x.com, gestor@loja.com")).toBe(true);
  });
  it("recusa e-mail fora da lista, vazio ou ausente", () => {
    expect(emailPermitido("outro@x.com", "a@x.com")).toBe(false);
    expect(emailPermitido("", "a@x.com")).toBe(false);
    expect(emailPermitido(undefined, "a@x.com")).toBe(false);
  });
  it("lista vazia não deixa ninguém entrar", () => {
    expect(emailPermitido("a@x.com", "")).toBe(false);
    expect(emailPermitido("a@x.com", " , ")).toBe(false);
  });
});
