// Regras puras de custo da ficha técnica e formação de preço.
import { arredondarCusto, arredondarDinheiro, arredondarQtd } from "./estoque";

/** Quantidade real consumida, incluindo a perda (0,05 = 5%). */
export function quantidadeComPerda(quantidade: number, perdaPercentual: number): number {
  return arredondarQtd(quantidade * (1 + perdaPercentual));
}

export type ItemFicha = {
  insumoId: number;
  nome: string;
  unidade: string;
  quantidade: number; // por unidade produzida, sem perda
  perdaPercentual: number;
  custoUnitario: number; // custo médio atual do insumo
};

export type ItemCusteado = ItemFicha & {
  quantidadeComPerda: number;
  custo: number; // custo do item com perda, por unidade produzida
  custoPerda: number; // parte do custo que é só perda
};

export type CustoProducao = {
  itens: ItemCusteado[];
  custoInsumos: number;
  custoPerda: number;
  custoOperacional: number;
  custoTotal: number;
};

/**
 * Custo real de uma unidade:
 * Σ (quantidade × (1 + perda) × custo unitário) + custo operacional.
 */
export function custoProducao(itens: ItemFicha[], custoOperacional: number): CustoProducao {
  const custeados = itens.map((it) => {
    const qtd = quantidadeComPerda(it.quantidade, it.perdaPercentual);
    const custo = arredondarCusto(qtd * it.custoUnitario);
    return {
      ...it,
      quantidadeComPerda: qtd,
      custo,
      custoPerda: arredondarCusto(custo - it.quantidade * it.custoUnitario),
    };
  });
  const custoInsumos = arredondarDinheiro(custeados.reduce((s, i) => s + i.custo, 0));
  return {
    itens: custeados,
    custoInsumos,
    custoPerda: arredondarDinheiro(custeados.reduce((s, i) => s + i.custoPerda, 0)),
    custoOperacional: arredondarDinheiro(custoOperacional),
    custoTotal: arredondarDinheiro(custoInsumos + custoOperacional),
  };
}

/**
 * Preço que entrega a margem-alvo sobre o preço de venda:
 * preço = custo ÷ (1 − margem). Ex.: custo 10, margem 40% → 16,67.
 */
export function precoSugerido(custo: number, margemAlvo: number): number {
  if (margemAlvo < 0 || margemAlvo >= 1) throw new RangeError("A margem-alvo deve ficar entre 0% e 99%.");
  return arredondarDinheiro(custo / (1 - margemAlvo));
}

/** Margem real sobre o preço: (preço − custo) ÷ preço. Nula se o preço for zero. */
export function margemReal(preco: number, custo: number): number | null {
  if (preco <= 0) return null;
  return Math.round(((preco - custo) / preco) * 10000) / 10000;
}

export type AnaliseProduto = CustoProducao & {
  margemAlvo: number;
  precoSugerido: number;
  /** Preço praticado; quando não informado, assume o sugerido. */
  precoPraticado: number;
  precoInformado: boolean;
  margemReal: number | null;
  lucroUnitario: number;
  /** Margem real abaixo da margem-alvo (com tolerância de 0,5 ponto). */
  abaixoDaMeta: boolean;
};

/** Junta custo, preço sugerido e margem real de um produto. */
export function analisarProduto(
  itens: ItemFicha[],
  custoOperacional: number,
  margemAlvo: number,
  precoVenda: number | null,
): AnaliseProduto {
  const custo = custoProducao(itens, custoOperacional);
  const sugerido = precoSugerido(custo.custoTotal, margemAlvo);
  const praticado = precoVenda ?? sugerido;
  const margem = margemReal(praticado, custo.custoTotal);
  return {
    ...custo,
    margemAlvo,
    precoSugerido: sugerido,
    precoPraticado: praticado,
    precoInformado: precoVenda !== null,
    margemReal: margem,
    lucroUnitario: arredondarDinheiro(praticado - custo.custoTotal),
    abaixoDaMeta: margem === null || margem < margemAlvo - 0.005,
  };
}
