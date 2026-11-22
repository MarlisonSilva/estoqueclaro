// Alertas de estoque e dados do dashboard, montados com as regras puras.
import { prisma } from "@/lib/db";
import { analisarInsumo, JANELA_CONSUMO_DIAS, ordenarPorUrgencia } from "@/lib/regras/alertas";
import type { TipoMovimentacao } from "@/lib/regras/estoque";
import { listarProdutosComAnalise } from "./produtos";

const TIPOS_CONSUMO = ["SAIDA_PRODUCAO", "PERDA", "ESTORNO"];

async function movimentosDaJanela(hoje: Date) {
  const inicio = new Date(hoje.getTime() - JANELA_CONSUMO_DIAS * 86400000);
  const movs = await prisma.movimentacao.findMany({
    where: { data: { gte: inicio, lte: hoje }, tipo: { in: TIPOS_CONSUMO } },
    select: { insumoId: true, tipo: true, quantidade: true, data: true, custoTotal: true },
  });
  const porInsumo = new Map<number, typeof movs>();
  for (const m of movs) porInsumo.set(m.insumoId, [...(porInsumo.get(m.insumoId) ?? []), m]);
  return porInsumo;
}

/** Todos os insumos ativos com semáforo, ordenados por urgência. */
export async function analisarEstoque(hoje = new Date()) {
  const [insumos, porInsumo] = await Promise.all([
    prisma.insumo.findMany({ where: { ativo: true } }),
    movimentosDaJanela(hoje),
  ]);
  return ordenarPorUrgencia(
    insumos.map((i) =>
      analisarInsumo(
        i,
        (porInsumo.get(i.id) ?? []).map((m) => ({ ...m, tipo: m.tipo as TipoMovimentacao })),
        hoje,
      ),
    ),
  );
}

export async function dadosDashboard(hoje = new Date()) {
  const [alertas, porInsumo, produtos, statusPedidos] = await Promise.all([
    analisarEstoque(hoje),
    movimentosDaJanela(hoje),
    listarProdutosComAnalise(),
    prisma.pedido.groupBy({ by: ["status"], _count: true }),
  ]);

  const contagem = (s: string) => statusPedidos.find((x) => x.status === s)?._count ?? 0;

  // Consumo em R$ nos últimos 30 dias: unidades diferentes (ml, folha, un) só se comparam em dinheiro.
  const consumo = alertas
    .map((a) => {
      const movs = porInsumo.get(a.id) ?? [];
      const sinal = (t: string) => (t === "ESTORNO" ? -1 : 1);
      return {
        nome: a.nome,
        unidade: a.unidade,
        valor: Math.round(movs.reduce((s, m) => s + sinal(m.tipo) * m.custoTotal, 0) * 100) / 100,
        quantidade: Math.round(a.consumoDiario * JANELA_CONSUMO_DIAS * 1000) / 1000,
      };
    })
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const margens = produtos
    .map((p) => ({
      nome: p.nome,
      margemReal: p.analise.margemReal ?? 0,
      margemAlvo: p.analise.margemAlvo,
      lucroUnitario: p.analise.lucroUnitario,
      abaixoDaMeta: p.analise.abaixoDaMeta,
    }))
    .sort((a, b) => b.margemReal - a.margemReal);

  return {
    cards: {
      vermelhos: alertas.filter((a) => a.semaforo === "VERMELHO").length,
      amarelos: alertas.filter((a) => a.semaforo === "AMARELO").length,
      valorEstoque: Math.round(alertas.reduce((s, a) => s + a.quantidadeEstoque * a.custoUnitario, 0) * 100) / 100,
      totalInsumos: alertas.length,
      emProducao: contagem("EM_PRODUCAO"),
      aguardandoArte: contagem("AGUARDANDO_ARTE"),
    },
    comprarHoje: alertas.filter((a) => a.semaforo !== "VERDE"),
    consumo,
    margens,
  };
}
