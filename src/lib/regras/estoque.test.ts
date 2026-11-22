import { describe, expect, it } from "vitest";
import {
  aplicarMovimento,
  custoMedioPonderado,
  deltaDoMovimento,
  EstoqueInsuficienteError,
  saldoPorHistorico,
} from "./estoque";

describe("deltaDoMovimento", () => {
  it("entrada e estorno somam, saída e perda subtraem", () => {
    expect(deltaDoMovimento("ENTRADA", 10)).toBe(10);
    expect(deltaDoMovimento("ESTORNO", 3)).toBe(3);
    expect(deltaDoMovimento("SAIDA_PRODUCAO", 4)).toBe(-4);
    expect(deltaDoMovimento("PERDA", 2)).toBe(-2);
  });

  it("ajuste respeita o sinal informado", () => {
    expect(deltaDoMovimento("AJUSTE", -5)).toBe(-5);
    expect(deltaDoMovimento("AJUSTE", 5)).toBe(5);
  });
});

describe("aplicarMovimento", () => {
  it("atualiza o saldo", () => {
    expect(aplicarMovimento(10, "SAIDA_PRODUCAO", 3)).toBe(7);
    expect(aplicarMovimento(0.1, "ENTRADA", 0.2)).toBe(0.3);
  });

  it("permite zerar o estoque", () => {
    expect(aplicarMovimento(5, "PERDA", 5)).toBe(0);
  });

  it("nunca deixa o saldo negativo", () => {
    expect(() => aplicarMovimento(2, "SAIDA_PRODUCAO", 3)).toThrow(EstoqueInsuficienteError);
    expect(() => aplicarMovimento(2, "AJUSTE", -3)).toThrow(EstoqueInsuficienteError);
  });
});

describe("custoMedioPonderado", () => {
  it("pondera saldo antigo e compra nova", () => {
    // 10 un a R$ 10 + 30 un a R$ 14 = (100 + 420) / 40 = 13
    expect(custoMedioPonderado(10, 10, 30, 14)).toBe(13);
  });

  it("com saldo zero assume o custo da compra", () => {
    expect(custoMedioPonderado(0, 99, 50, 2.5)).toBe(2.5);
  });
});

describe("saldoPorHistorico", () => {
  it("reconstrói o saldo a partir das movimentações", () => {
    expect(
      saldoPorHistorico([
        { tipo: "ENTRADA", quantidade: 100 },
        { tipo: "SAIDA_PRODUCAO", quantidade: 30 },
        { tipo: "PERDA", quantidade: 5 },
        { tipo: "ESTORNO", quantidade: 10 },
        { tipo: "AJUSTE", quantidade: -2 },
      ]),
    ).toBe(73);
  });
});
