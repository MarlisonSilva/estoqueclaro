import { describe, expect, it } from "vitest";
import {
  analisarInsumo,
  consumoMedioDiario,
  diasRestantes,
  ordenarPorUrgencia,
  pontoPedido,
  quantidadeSugerida,
  semaforo,
} from "./alertas";

const hoje = new Date("2026-06-30T12:00:00");
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86400000);

describe("consumoMedioDiario", () => {
  it("soma saídas e perdas dos últimos 30 dias e desconta estornos", () => {
    const c = consumoMedioDiario(
      [
        { tipo: "SAIDA_PRODUCAO", quantidade: 50, data: diasAtras(1) },
        { tipo: "PERDA", quantidade: 10, data: diasAtras(10) },
        { tipo: "ESTORNO", quantidade: 15, data: diasAtras(2) },
        { tipo: "ENTRADA", quantidade: 500, data: diasAtras(3) }, // compra não é consumo
        { tipo: "AJUSTE", quantidade: -20, data: diasAtras(3) }, // inventário não é consumo
        { tipo: "SAIDA_PRODUCAO", quantidade: 999, data: diasAtras(31) }, // fora da janela
      ],
      hoje,
    );
    expect(c).toBe(1.5); // (50 + 10 − 15) ÷ 30
  });

  it("sem movimentos o consumo é zero", () => {
    expect(consumoMedioDiario([], hoje)).toBe(0);
  });
});

describe("diasRestantes e pontoPedido", () => {
  it("dias restantes = saldo ÷ consumo", () => {
    expect(diasRestantes(30, 2)).toBe(15);
    expect(diasRestantes(30, 0)).toBe(Infinity);
  });

  it("ponto de pedido = consumo × prazo + mínimo", () => {
    expect(pontoPedido(2, 10, 20)).toBe(40);
  });
});

describe("semaforo", () => {
  // consumo 2/dia, prazo 10, mínimo 20 → ponto de pedido 40
  it("verde acima do ponto de pedido", () => {
    expect(semaforo(41, 20, 2, 10)).toBe("VERDE");
  });

  it("amarelo ao atingir o ponto de pedido", () => {
    expect(semaforo(40, 20, 2, 10)).toBe("AMARELO");
    expect(semaforo(25, 20, 2, 10)).toBe("AMARELO");
  });

  it("vermelho abaixo do mínimo", () => {
    expect(semaforo(19, 20, 0, 10)).toBe("VERMELHO");
  });

  it("vermelho quando acaba antes da entrega, mesmo acima do mínimo", () => {
    // mínimo 5, consumo 4/dia, prazo 10: 30 un duram 7,5 dias < 10
    expect(semaforo(30, 5, 4, 10)).toBe("VERMELHO");
  });

  it("insumo parado acima do mínimo é verde", () => {
    expect(semaforo(21, 20, 0, 10)).toBe("VERDE");
  });
});

describe("quantidadeSugerida", () => {
  it("cobre prazo + 30 dias e repõe o mínimo", () => {
    // 2 × (10 + 30) + 20 − 25 = 75
    expect(quantidadeSugerida(25, 20, 2, 10)).toBe(75);
  });

  it("arredonda para cima e nunca é negativa", () => {
    expect(quantidadeSugerida(0, 0, 0.1, 5)).toBe(4); // 3,5 → 4
    expect(quantidadeSugerida(1000, 20, 2, 10)).toBe(0);
  });
});

describe("analisarInsumo e ordenarPorUrgencia", () => {
  const base = { unidade: "un", estoqueMinimo: 20, prazoEntregaDias: 10, custoUnitario: 2 };
  const consumo2 = [{ tipo: "SAIDA_PRODUCAO" as const, quantidade: 60, data: diasAtras(5) }];

  it("monta o alerta com motivo e custo da compra sugerida", () => {
    const a = analisarInsumo({ ...base, id: 1, nome: "Wire-o", quantidadeEstoque: 25 }, consumo2, hoje);
    expect(a.semaforo).toBe("AMARELO");
    expect(a.quantidadeSugerida).toBe(75);
    expect(a.custoSugerido).toBe(150);
    expect(a.motivo).toMatch(/ponto de pedido/);
  });

  it("verde não sugere compra", () => {
    const a = analisarInsumo({ ...base, id: 1, nome: "x", quantidadeEstoque: 500 }, consumo2, hoje);
    expect(a.quantidadeSugerida).toBe(0);
  });

  it("ordena vermelho, amarelo, verde e, dentro da cor, menor folga primeiro", () => {
    const ins = (id: number, saldo: number) => analisarInsumo({ ...base, id, nome: String(id), quantidadeEstoque: saldo }, consumo2, hoje);
    const ordem = ordenarPorUrgencia([ins(1, 500), ins(2, 30), ins(3, 10), ins(4, 25)]).map((a) => a.id);
    expect(ordem).toEqual([3, 4, 2, 1]);
  });
});
