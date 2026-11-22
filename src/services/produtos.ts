// Produtos e fichas técnicas. O custo é sempre calculado na hora, com o custo médio atual dos insumos.
import { prisma } from "@/lib/db";
import { RegraNegocioError } from "@/lib/erros";
import { analisarProduto, type ItemFicha } from "@/lib/regras/custo";
import type { FichaItemDados, ProdutoDados } from "@/lib/validacao/produto";

const incluirFicha = {
  itens: {
    include: { insumo: { select: { id: true, nome: true, unidade: true, custoUnitario: true } } },
    orderBy: { id: "asc" as const },
  },
};

type ProdutoComFicha = NonNullable<Awaited<ReturnType<typeof buscarComFicha>>>;

function buscarComFicha(id: number) {
  return prisma.produto.findUnique({ where: { id }, include: incluirFicha });
}

/** Itens da ficha no formato das regras puras. */
export function itensDaFicha(p: Pick<ProdutoComFicha, "itens">): ItemFicha[] {
  return p.itens.map((i) => ({
    insumoId: i.insumoId,
    nome: i.insumo.nome,
    unidade: i.insumo.unidade,
    quantidade: i.quantidade,
    perdaPercentual: i.perdaPercentual,
    custoUnitario: i.insumo.custoUnitario,
  }));
}

const analisar = (p: ProdutoComFicha) => analisarProduto(itensDaFicha(p), p.custoOperacional, p.margemAlvo, p.precoVenda);

export async function listarProdutosComAnalise(incluirInativos = false) {
  const produtos = await prisma.produto.findMany({
    where: incluirInativos ? undefined : { ativo: true },
    include: incluirFicha,
    orderBy: { nome: "asc" },
  });
  return produtos.map((p) => ({ ...p, analise: analisar(p) }));
}

export async function obterProdutoComAnalise(id: number) {
  const p = await buscarComFicha(id);
  return p && { ...p, analise: analisar(p), totalPedidos: await prisma.pedido.count({ where: { produtoId: id } }) };
}

export function criarProduto(d: ProdutoDados) {
  return prisma.produto.create({ data: d });
}

export function atualizarProduto(id: number, d: ProdutoDados) {
  return prisma.produto.update({ where: { id }, data: d });
}

/** Adiciona o insumo à ficha ou atualiza se já estiver nela. */
export async function salvarItemFicha(produtoId: number, d: FichaItemDados) {
  const insumo = await prisma.insumo.findUnique({ where: { id: d.insumoId } });
  if (!insumo?.ativo) throw new RegraNegocioError("Insumo não encontrado ou inativo.");
  return prisma.fichaItem.upsert({
    where: { produtoId_insumoId: { produtoId, insumoId: d.insumoId } },
    create: { produtoId, ...d },
    update: { quantidade: d.quantidade, perdaPercentual: d.perdaPercentual },
  });
}

export function removerItemFicha(produtoId: number, itemId: number) {
  return prisma.fichaItem.deleteMany({ where: { id: itemId, produtoId } });
}

/** Produto com pedidos é só desativado, para não apagar histórico de vendas. */
export async function excluirOuDesativarProduto(id: number): Promise<"excluido" | "desativado"> {
  const pedidos = await prisma.pedido.count({ where: { produtoId: id } });
  if (pedidos === 0) {
    await prisma.produto.delete({ where: { id } }); // itens da ficha caem em cascata
    return "excluido";
  }
  await prisma.produto.update({ where: { id }, data: { ativo: false } });
  return "desativado";
}

export function reativarProduto(id: number) {
  return prisma.produto.update({ where: { id }, data: { ativo: true } });
}
