// Previsão de consumo mensal: busca o histórico no banco e usa as regras puras.
import { prisma } from "@/lib/db";
import type { TipoMovimentacao } from "@/lib/regras/estoque";
import { agruparPorMes, analisarPrevisao, MESES_HISTORICO, Z_PADRAO } from "@/lib/regras/previsao";

const TIPOS_CONSUMO = ["SAIDA_PRODUCAO", "PERDA", "ESTORNO"];

/** Previsão de um insumo (`insumoId`) ou de todos os ativos, com os últimos `meses` meses completos. */
export async function previsoesDeConsumo(
  { insumoId, hoje = new Date(), meses = MESES_HISTORICO, z = Z_PADRAO }: { insumoId?: number; hoje?: Date; meses?: number; z?: number } = {},
) {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - meses, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1); // exclusivo: mês atual está incompleto
  const insumos = await prisma.insumo.findMany({
    where: insumoId ? { id: insumoId } : { ativo: true },
    orderBy: { nome: "asc" },
    include: { movimentacoes: { where: { tipo: { in: TIPOS_CONSUMO }, data: { gte: inicio, lt: fim } }, select: { tipo: true, quantidade: true, data: true } } },
  });
  return insumos.map(({ movimentacoes, ...insumo }) => ({
    insumo,
    ...analisarPrevisao(
      agruparPorMes(movimentacoes.map((m) => ({ ...m, tipo: m.tipo as TipoMovimentacao })), hoje, meses),
      insumo.quantidadeEstoque,
      insumo.estoqueMinimo,
      hoje,
      z,
    ),
  }));
}
