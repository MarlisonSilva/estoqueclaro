import { describe, expect, it } from "vitest";
import {
  baixaEstoque,
  estornaEstoque,
  necessidadeInsumos,
  quantidadesAEstornar,
  transicaoPermitida,
  verificarFaltas,
} from "./producao";

describe("transições de status", () => {
  it("segue o fluxo aguardando arte → produção → concluído", () => {
    expect(transicaoPermitida("AGUARDANDO_ARTE", "EM_PRODUCAO")).toBe(true);
    expect(transicaoPermitida("EM_PRODUCAO", "CONCLUIDO")).toBe(true);
    expect(transicaoPermitida("AGUARDANDO_ARTE", "CANCELADO")).toBe(true);
    expect(transicaoPermitida("EM_PRODUCAO", "CANCELADO")).toBe(true);
  });

  it("bloqueia pular etapas e reabrir pedidos finalizados", () => {
    expect(transicaoPermitida("AGUARDANDO_ARTE", "CONCLUIDO")).toBe(false);
    expect(transicaoPermitida("CONCLUIDO", "CANCELADO")).toBe(false);
    expect(transicaoPermitida("CANCELADO", "EM_PRODUCAO")).toBe(false);
  });

  it("baixa só ao entrar em produção e estorna só ao cancelar em produção", () => {
    expect(baixaEstoque("AGUARDANDO_ARTE", "EM_PRODUCAO")).toBe(true);
    expect(estornaEstoque("EM_PRODUCAO", "CANCELADO")).toBe(true);
    expect(estornaEstoque("AGUARDANDO_ARTE", "CANCELADO")).toBe(false);
  });
});

describe("necessidadeInsumos", () => {
  it("multiplica pela quantidade do pedido e aplica a perda", () => {
    const n = necessidadeInsumos(
      [
        { insumoId: 1, quantidade: 40, perdaPercentual: 0.03 }, // miolo
        { insumoId: 2, quantidade: 1, perdaPercentual: 0 }, // wire-o
      ],
      5,
    );
    expect(n).toEqual([
      { insumoId: 1, quantidade: 206 }, // 40 × 5 × 1,03
      { insumoId: 2, quantidade: 5 },
    ]);
  });
});

describe("verificarFaltas", () => {
  it("informa exatamente o que falta e quanto", () => {
    const faltas = verificarFaltas(
      [
        { insumoId: 1, quantidade: 206 },
        { insumoId: 2, quantidade: 5 },
        { insumoId: 3, quantidade: 2 },
      ],
      new Map([
        [1, 300],
        [2, 3],
      ]),
    );
    expect(faltas).toEqual([
      { insumoId: 2, necessario: 5, disponivel: 3, falta: 2 },
      { insumoId: 3, necessario: 2, disponivel: 0, falta: 2 },
    ]);
  });

  it("saldo exato é suficiente", () => {
    expect(verificarFaltas([{ insumoId: 1, quantidade: 5 }], new Map([[1, 5]]))).toEqual([]);
  });
});

describe("quantidadesAEstornar", () => {
  it("devolve as saídas do pedido", () => {
    expect(
      quantidadesAEstornar([
        { insumoId: 1, tipo: "SAIDA_PRODUCAO", quantidade: 206 },
        { insumoId: 2, tipo: "SAIDA_PRODUCAO", quantidade: 5 },
      ]),
    ).toEqual([
      { insumoId: 1, quantidade: 206 },
      { insumoId: 2, quantidade: 5 },
    ]);
  });

  it("não estorna em dobro", () => {
    expect(
      quantidadesAEstornar([
        { insumoId: 1, tipo: "SAIDA_PRODUCAO", quantidade: 10 },
        { insumoId: 1, tipo: "ESTORNO", quantidade: 10 },
      ]),
    ).toEqual([]);
  });
});
