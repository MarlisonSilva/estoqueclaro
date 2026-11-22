// Regras puras de estoque: sinal dos movimentos, saldo e custo médio ponderado.
// Nada aqui acessa banco; os services chamam estas funções dentro de transações.

export const TIPOS_MOVIMENTACAO = [
  "ENTRADA",
  "SAIDA_PRODUCAO",
  "PERDA",
  "AJUSTE",
  "ESTORNO",
] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const UNIDADES = ["un", "folha", "ml", "m", "kg"] as const;
export type Unidade = (typeof UNIDADES)[number];

/** Arredonda quantidades (3 casas) para evitar lixo de ponto flutuante. */
export const arredondarQtd = (n: number) => Math.round(n * 1000) / 1000;
/** Arredonda valores em reais (2 casas). */
export const arredondarDinheiro = (n: number) => Math.round(n * 100) / 100;
/** Custo unitário guarda 4 casas: centavos de fração de folha/ml importam. */
export const arredondarCusto = (n: number) => Math.round(n * 10000) / 10000;

export class EstoqueInsuficienteError extends Error {
  constructor(
    public saldoAtual: number,
    public delta: number,
  ) {
    super(
      `Saldo insuficiente: saldo ${saldoAtual}, movimento ${delta}. O estoque não pode ficar negativo.`,
    );
    this.name = "EstoqueInsuficienteError";
  }
}

/**
 * Converte quantidade + tipo em variação do saldo.
 * AJUSTE já vem com sinal (delta de inventário); os demais vêm positivos.
 */
export function deltaDoMovimento(tipo: TipoMovimentacao, quantidade: number): number {
  switch (tipo) {
    case "ENTRADA":
    case "ESTORNO":
      return Math.abs(quantidade);
    case "SAIDA_PRODUCAO":
    case "PERDA":
      return -Math.abs(quantidade);
    case "AJUSTE":
      return quantidade;
  }
}

/** Aplica o movimento ao saldo. Lança erro se o saldo ficaria negativo. */
export function aplicarMovimento(
  saldoAtual: number,
  tipo: TipoMovimentacao,
  quantidade: number,
): number {
  const delta = deltaDoMovimento(tipo, quantidade);
  const novo = arredondarQtd(saldoAtual + delta);
  if (!Number.isFinite(novo)) throw new Error("Quantidade inválida.");
  if (novo < 0) throw new EstoqueInsuficienteError(saldoAtual, delta);
  return novo;
}

/**
 * Custo médio ponderado após uma compra:
 * (saldo × custoAtual + qtdComprada × custoCompra) / (saldo + qtdComprada).
 * Com saldo zero, o custo passa a ser o da compra.
 */
export function custoMedioPonderado(
  saldoAtual: number,
  custoAtual: number,
  qtdEntrada: number,
  custoEntrada: number,
): number {
  const total = saldoAtual + qtdEntrada;
  if (total <= 0) return arredondarCusto(custoEntrada);
  return arredondarCusto((saldoAtual * custoAtual + qtdEntrada * custoEntrada) / total);
}

/** Recalcula o saldo a partir do histórico (usado para auditar o cache). */
export function saldoPorHistorico(
  movimentos: { tipo: TipoMovimentacao; quantidade: number }[],
): number {
  return arredondarQtd(movimentos.reduce((s, m) => s + deltaDoMovimento(m.tipo, m.quantidade), 0));
}
