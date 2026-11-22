// Regras puras de pedidos: fluxo de status, necessidade de insumos, faltas e estorno.
import { quantidadeComPerda } from "./custo";
import { arredondarQtd, deltaDoMovimento, type TipoMovimentacao } from "./estoque";

export const STATUS_PEDIDO = ["AGUARDANDO_ARTE", "EM_PRODUCAO", "CONCLUIDO", "CANCELADO"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

/** Transições permitidas. CONCLUIDO e CANCELADO são finais. */
const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  AGUARDANDO_ARTE: ["EM_PRODUCAO", "CANCELADO"],
  EM_PRODUCAO: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: [],
};

export const proximosStatus = (de: StatusPedido) => TRANSICOES[de];
export const transicaoPermitida = (de: StatusPedido, para: StatusPedido) => TRANSICOES[de].includes(para);

/** Só a entrada em produção baixa estoque; só o cancelamento de quem está em produção estorna. */
export const baixaEstoque = (de: StatusPedido, para: StatusPedido) => de === "AGUARDANDO_ARTE" && para === "EM_PRODUCAO";
export const estornaEstoque = (de: StatusPedido, para: StatusPedido) => de === "EM_PRODUCAO" && para === "CANCELADO";

export type ItemReceita = { insumoId: number; quantidade: number; perdaPercentual: number };
export type Necessidade = { insumoId: number; quantidade: number };

/** Quanto de cada insumo o pedido consome, já com a perda: qtd/unidade × qtd pedida × (1 + perda). */
export function necessidadeInsumos(itens: ItemReceita[], quantidadePedido: number): Necessidade[] {
  return itens.map((it) => ({
    insumoId: it.insumoId,
    quantidade: quantidadeComPerda(it.quantidade * quantidadePedido, it.perdaPercentual),
  }));
}

export type Falta = { insumoId: number; necessario: number; disponivel: number; falta: number };

/** Lista os insumos sem saldo suficiente e quanto falta de cada um. */
export function verificarFaltas(necessidade: Necessidade[], saldos: Map<number, number>): Falta[] {
  return necessidade
    .map((n) => {
      const disponivel = saldos.get(n.insumoId) ?? 0;
      return { insumoId: n.insumoId, necessario: n.quantidade, disponivel, falta: arredondarQtd(n.quantidade - disponivel) };
    })
    .filter((f) => f.falta > 0);
}

/**
 * Quanto devolver ao estoque ao cancelar: saídas de produção do pedido menos estornos já feitos.
 * Assim, chamar duas vezes nunca devolve em dobro.
 */
export function quantidadesAEstornar(movimentos: { insumoId: number; tipo: TipoMovimentacao; quantidade: number }[]): Necessidade[] {
  const liquido = new Map<number, number>();
  for (const m of movimentos) {
    if (m.tipo !== "SAIDA_PRODUCAO" && m.tipo !== "ESTORNO") continue;
    liquido.set(m.insumoId, (liquido.get(m.insumoId) ?? 0) - deltaDoMovimento(m.tipo, m.quantidade));
  }
  return [...liquido]
    .map(([insumoId, q]) => ({ insumoId, quantidade: arredondarQtd(q) }))
    .filter((n) => n.quantidade > 0);
}
