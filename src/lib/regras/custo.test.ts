import { describe, expect, it } from "vitest";
import { analisarProduto, custoProducao, margemReal, precoSugerido, quantidadeComPerda, type ItemFicha } from "./custo";

const item = (quantidade: number, perdaPercentual: number, custoUnitario: number): ItemFicha => ({
  insumoId: 1,
  nome: "x",
  unidade: "un",
  quantidade,
  perdaPercentual,
  custoUnitario,
});

describe("quantidadeComPerda", () => {
  it("acrescenta o percentual de perda", () => {
    expect(quantidadeComPerda(40, 0.05)).toBe(42);
    expect(quantidadeComPerda(1, 0)).toBe(1);
    expect(quantidadeComPerda(0.35, 0.05)).toBe(0.368); // arredonda em 3 casas
  });
});

describe("custoProducao", () => {
  it("soma itens com perda e custo operacional", () => {
    // capa: 1 × 1,05 × 2,00 = 2,10 | miolo: 40 × 1,03 × 0,10 = 4,12 | op: 6
    const c = custoProducao([item(1, 0.05, 2), item(40, 0.03, 0.1)], 6);
    expect(c.custoInsumos).toBe(6.22);
    expect(c.custoTotal).toBe(12.22);
    // perda: 0,10 da capa + 0,12 do miolo
    expect(c.custoPerda).toBe(0.22);
  });

  it("ficha vazia custa só o operacional", () => {
    expect(custoProducao([], 3.5).custoTotal).toBe(3.5);
  });
});

describe("precoSugerido", () => {
  it("aplica a margem sobre o preço de venda", () => {
    expect(precoSugerido(10, 0.4)).toBe(16.67);
    expect(precoSugerido(10, 0)).toBe(10);
  });

  it("recusa margem de 100% ou mais", () => {
    expect(() => precoSugerido(10, 1)).toThrow(RangeError);
    expect(() => precoSugerido(10, -0.1)).toThrow(RangeError);
  });
});

describe("margemReal", () => {
  it("calcula sobre o preço", () => {
    expect(margemReal(20, 12)).toBe(0.4);
    expect(margemReal(10, 12)).toBe(-0.2); // prejuízo
  });

  it("é nula sem preço", () => {
    expect(margemReal(0, 5)).toBeNull();
  });
});

describe("analisarProduto", () => {
  it("sem preço praticado usa o sugerido e bate a meta", () => {
    const a = analisarProduto([item(1, 0, 6)], 4, 0.5, null);
    expect(a.custoTotal).toBe(10);
    expect(a.precoSugerido).toBe(20);
    expect(a.precoPraticado).toBe(20);
    expect(a.precoInformado).toBe(false);
    expect(a.margemReal).toBe(0.5);
    expect(a.abaixoDaMeta).toBe(false);
  });

  it("preço praticado abaixo do sugerido mostra a margem real menor", () => {
    const a = analisarProduto([item(1, 0, 6)], 4, 0.5, 16);
    expect(a.margemReal).toBe(0.375);
    expect(a.lucroUnitario).toBe(6);
    expect(a.abaixoDaMeta).toBe(true);
  });
});
