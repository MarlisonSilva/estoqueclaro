// Regras puras do coração do SAD: consumo médio, dias restantes, ponto de pedido,
// semáforo e sugestão de compra.
import type { TipoMovimentacao } from "./estoque";

export const JANELA_CONSUMO_DIAS = 30;
/** Quantos dias de consumo a compra sugerida cobre além do prazo de entrega. */
export const COBERTURA_COMPRA_DIAS = 30;

export type Semaforo = "VERMELHO" | "AMARELO" | "VERDE";

type MovConsumo = { tipo: TipoMovimentacao; quantidade: number; data: Date };

/**
 * Consumo médio diário na janela: (saídas de produção + perdas − estornos) ÷ dias.
 * Ajustes de inventário não entram: são correção de contagem, não consumo.
 */
export function consumoMedioDiario(movs: MovConsumo[], hoje: Date, janelaDias = JANELA_CONSUMO_DIAS): number {
  const inicio = hoje.getTime() - janelaDias * 86400000;
  let total = 0;
  for (const m of movs) {
    const t = m.data.getTime();
    if (t < inicio || t > hoje.getTime()) continue;
    if (m.tipo === "SAIDA_PRODUCAO" || m.tipo === "PERDA") total += m.quantidade;
    else if (m.tipo === "ESTORNO") total -= m.quantidade;
  }
  return Math.max(0, total) / janelaDias;
}

/** Dias até zerar o estoque no ritmo atual. Sem consumo: infinito. */
export function diasRestantes(saldo: number, consumoDiario: number): number {
  return consumoDiario > 0 ? saldo / consumoDiario : Infinity;
}

/** Ponto de pedido = consumo médio diário × prazo de entrega + estoque de segurança. */
export function pontoPedido(consumoDiario: number, prazoEntregaDias: number, estoqueMinimo: number): number {
  return consumoDiario * prazoEntregaDias + estoqueMinimo;
}

/**
 * Vermelho: abaixo do mínimo, ou acaba antes de a compra chegar.
 * Amarelo: atingiu o ponto de pedido (comprar agora).
 * Verde: ok.
 */
export function semaforo(saldo: number, estoqueMinimo: number, consumoDiario: number, prazoEntregaDias: number): Semaforo {
  if (saldo < estoqueMinimo || diasRestantes(saldo, consumoDiario) < prazoEntregaDias) return "VERMELHO";
  if (saldo <= pontoPedido(consumoDiario, prazoEntregaDias, estoqueMinimo)) return "AMARELO";
  return "VERDE";
}

/**
 * Quanto comprar para cobrir o prazo de entrega + 30 dias e repor o estoque de segurança:
 * consumo × (prazo + cobertura) + mínimo − saldo, arredondado para cima.
 */
export function quantidadeSugerida(
  saldo: number,
  estoqueMinimo: number,
  consumoDiario: number,
  prazoEntregaDias: number,
  coberturaDias = COBERTURA_COMPRA_DIAS,
): number {
  return Math.max(0, Math.ceil(consumoDiario * (prazoEntregaDias + coberturaDias) + estoqueMinimo - saldo));
}

export type InsumoParaAlerta = {
  id: number;
  nome: string;
  unidade: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  prazoEntregaDias: number;
  custoUnitario: number;
};

export type AlertaInsumo = InsumoParaAlerta & {
  consumoDiario: number;
  diasRestantes: number;
  pontoPedido: number;
  semaforo: Semaforo;
  quantidadeSugerida: number;
  custoSugerido: number;
  /** Dias de estoque que sobram depois que a compra chegaria (negativo = vai faltar). */
  folgaDias: number;
  motivo: string;
};

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("pt-BR");

export function analisarInsumo(insumo: InsumoParaAlerta, movs: MovConsumo[], hoje: Date): AlertaInsumo {
  const consumo = consumoMedioDiario(movs, hoje);
  const dias = diasRestantes(insumo.quantidadeEstoque, consumo);
  const pp = pontoPedido(consumo, insumo.prazoEntregaDias, insumo.estoqueMinimo);
  const cor = semaforo(insumo.quantidadeEstoque, insumo.estoqueMinimo, consumo, insumo.prazoEntregaDias);
  const sugerida = cor === "VERDE" ? 0 : quantidadeSugerida(insumo.quantidadeEstoque, insumo.estoqueMinimo, consumo, insumo.prazoEntregaDias);

  let motivo = "Estoque ok";
  if (insumo.quantidadeEstoque < insumo.estoqueMinimo) motivo = `Abaixo do mínimo (${fmt(insumo.estoqueMinimo)} ${insumo.unidade})`;
  else if (cor === "VERMELHO") motivo = `Acaba em ${fmt(dias)} dias; a entrega leva ${insumo.prazoEntregaDias}`;
  else if (cor === "AMARELO") motivo = `Atingiu o ponto de pedido (${fmt(pp)} ${insumo.unidade})`;

  return {
    ...insumo,
    consumoDiario: consumo,
    diasRestantes: dias,
    pontoPedido: pp,
    semaforo: cor,
    quantidadeSugerida: sugerida,
    custoSugerido: Math.round(sugerida * insumo.custoUnitario * 100) / 100,
    folgaDias: dias - insumo.prazoEntregaDias,
    motivo,
  };
}

const PESO: Record<Semaforo, number> = { VERMELHO: 0, AMARELO: 1, VERDE: 2 };

/** Mais urgente primeiro: cor do semáforo, depois menor folga, depois menor saldo relativo ao mínimo. */
export function ordenarPorUrgencia<T extends Pick<AlertaInsumo, "semaforo" | "folgaDias" | "quantidadeEstoque" | "estoqueMinimo">>(alertas: T[]): T[] {
  const relativo = (a: T) => (a.estoqueMinimo > 0 ? a.quantidadeEstoque / a.estoqueMinimo : Infinity);
  return [...alertas].sort(
    (a, b) => PESO[a.semaforo] - PESO[b.semaforo] || a.folgaDias - b.folgaDias || relativo(a) - relativo(b),
  );
}
