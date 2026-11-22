// Financeiro simples: vendas concluídas (pela data de conclusão) e compras de insumos (ENTRADA).
import { prisma } from "@/lib/db";
import { inicioDaJanela, resumoMensal, totais } from "@/lib/regras/financeiro";

export async function resumoFinanceiro(hoje = new Date(), meses = 12) {
  const inicio = inicioDaJanela(hoje, meses);
  const [pedidos, compras] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: "CONCLUIDO", concluidoEm: { gte: inicio } },
      select: { concluidoEm: true, quantidade: true, precoUnitario: true },
    }),
    prisma.movimentacao.findMany({
      where: { tipo: "ENTRADA", data: { gte: inicio } },
      select: { data: true, custoTotal: true },
    }),
  ]);
  const resumo = resumoMensal(
    pedidos.map((p) => ({ data: p.concluidoEm!, valor: p.quantidade * p.precoUnitario })),
    compras.map((c) => ({ data: c.data, valor: c.custoTotal })),
    hoje,
    meses,
  );
  return { resumo, totais: totais(resumo), vendas: pedidos.length };
}
