// Cadastro de insumos. Saldo e custo só mudam via movimentações.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RegraNegocioError } from "@/lib/erros";
import type { InsumoCriacao, InsumoEdicao } from "@/lib/validacao/insumo";
import { registrarMovimentacaoTx } from "./movimentacoes";

export type FiltroInsumos = { busca?: string; categoria?: string; inativos?: boolean };

export function listarInsumos(f: FiltroInsumos = {}) {
  const where: Prisma.InsumoWhereInput = {
    ativo: f.inativos ? undefined : true,
    categoria: f.categoria || undefined,
    nome: f.busca ? { contains: f.busca, mode: "insensitive" } : undefined,
  };
  return prisma.insumo.findMany({ where, orderBy: { nome: "asc" } });
}

export async function listarCategorias() {
  const linhas = await prisma.insumo.findMany({ distinct: ["categoria"], select: { categoria: true }, orderBy: { categoria: "asc" } });
  return linhas.map((l) => l.categoria);
}

export function obterInsumo(id: number) {
  return prisma.insumo.findUnique({
    where: { id },
    include: {
      movimentacoes: { orderBy: [{ data: "desc" }, { id: "desc" }], take: 50 },
      fichaItens: { include: { produto: { select: { id: true, nome: true } } } },
      _count: { select: { movimentacoes: true } },
    },
  });
}

/** Cria o insumo; quantidade inicial vira uma ENTRADA para o saldo ter origem rastreável. */
export function criarInsumo(d: InsumoCriacao) {
  return prisma.$transaction(async (tx) => {
    const insumo = await tx.insumo.create({
      data: {
        nome: d.nome,
        categoria: d.categoria,
        unidade: d.unidade,
        estoqueMinimo: d.estoqueMinimo,
        prazoEntregaDias: d.prazoEntregaDias,
        custoUnitario: d.custoUnitario,
      },
    });
    if (d.quantidadeInicial > 0) {
      await registrarMovimentacaoTx(tx, {
        insumoId: insumo.id,
        tipo: "ENTRADA",
        quantidade: d.quantidadeInicial,
        custoUnitario: d.custoUnitario,
        motivo: "Estoque inicial",
      });
    }
    return insumo;
  });
}

export function atualizarInsumo(id: number, d: InsumoEdicao) {
  return prisma.insumo.update({ where: { id }, data: d });
}

/**
 * Exclui o insumo se nunca foi usado. Com histórico ou ficha técnica, apenas desativa
 * (some das listas, mas o histórico e o financeiro continuam corretos).
 */
export async function excluirOuDesativarInsumo(id: number): Promise<"excluido" | "desativado"> {
  const insumo = await prisma.insumo.findUnique({
    where: { id },
    include: { _count: { select: { movimentacoes: true, fichaItens: true } } },
  });
  if (!insumo) throw new RegraNegocioError("Insumo não encontrado.");
  if (insumo._count.movimentacoes === 0 && insumo._count.fichaItens === 0) {
    await prisma.insumo.delete({ where: { id } });
    return "excluido";
  }
  await prisma.insumo.update({ where: { id }, data: { ativo: false } });
  return "desativado";
}

export function reativarInsumo(id: number) {
  return prisma.insumo.update({ where: { id }, data: { ativo: true } });
}
