// Pedidos: criação, mudança de status com baixa automática e estorno, tudo em transação.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RegraNegocioError } from "@/lib/erros";
import { numero } from "@/lib/formatacao";
import { analisarProduto } from "@/lib/regras/custo";
import type { TipoMovimentacao } from "@/lib/regras/estoque";
import {
  baixaEstoque,
  estornaEstoque,
  necessidadeInsumos,
  quantidadesAEstornar,
  transicaoPermitida,
  verificarFaltas,
  type Falta,
  type StatusPedido,
} from "@/lib/regras/producao";
import type { PedidoDados } from "@/lib/validacao/pedido";
import { registrarMovimentacaoTx } from "./movimentacoes";
import { itensDaFicha } from "./produtos";

export type FaltaDetalhada = Falta & { nome: string; unidade: string };

/** Produção bloqueada: a mensagem já lista o que falta; `faltas` traz os números. */
export class FaltaInsumosError extends RegraNegocioError {
  constructor(public faltas: FaltaDetalhada[]) {
    super(
      "Produção bloqueada por falta de insumos: " +
        faltas.map((f) => `${f.nome} (precisa ${numero(f.necessario)} ${f.unidade}, tem ${numero(f.disponivel)}, faltam ${numero(f.falta)})`).join("; ") +
        ".",
    );
    this.name = "FaltaInsumosError";
  }
}

export async function criarPedido(d: PedidoDados) {
  const produto = await prisma.produto.findUnique({ where: { id: d.produtoId }, include: { itens: { include: { insumo: true } } } });
  if (!produto?.ativo) throw new RegraNegocioError("Produto não encontrado ou inativo.");
  // Sem preço informado: usa o praticado do produto, ou o sugerido pela ficha.
  const preco =
    d.precoUnitario ??
    produto.precoVenda ??
    analisarProduto(itensDaFicha(produto), produto.custoOperacional, produto.margemAlvo, null).precoSugerido;
  return prisma.pedido.create({
    data: { cliente: d.cliente, produtoId: d.produtoId, quantidade: d.quantidade, precoUnitario: preco },
  });
}

/** Faltas que impediriam a produção, consultadas dentro da transação ou fora dela. */
async function faltasParaProduzir(db: Prisma.TransactionClient, produtoId: number, quantidade: number) {
  const itens = await db.fichaItem.findMany({ where: { produtoId }, include: { insumo: true } });
  const necessidade = necessidadeInsumos(itens, quantidade);
  const saldos = new Map(itens.map((i) => [i.insumoId, i.insumo.quantidadeEstoque]));
  const insumo = new Map(itens.map((i) => [i.insumoId, i.insumo]));
  const faltas: FaltaDetalhada[] = verificarFaltas(necessidade, saldos).map((f) => ({
    ...f,
    nome: insumo.get(f.insumoId)!.nome,
    unidade: insumo.get(f.insumoId)!.unidade,
  }));
  return { itens, necessidade, faltas };
}

/**
 * Muda o status. Ao entrar em produção, baixa todos os insumos (com perda) ou bloqueia
 * se faltar algo. Ao cancelar um pedido em produção, estorna as saídas.
 * Tudo numa transação: ou o pedido muda e o estoque acompanha, ou nada muda.
 */
export function mudarStatusPedido(id: number, novo: StatusPedido) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id } });
    if (!pedido) throw new RegraNegocioError("Pedido não encontrado.");
    const atual = pedido.status as StatusPedido;
    if (!transicaoPermitida(atual, novo)) {
      throw new RegraNegocioError(`Não é possível mudar de ${atual} para ${novo}.`);
    }

    if (baixaEstoque(atual, novo)) {
      const { itens, necessidade, faltas } = await faltasParaProduzir(tx, pedido.produtoId, pedido.quantidade);
      if (itens.length === 0) throw new RegraNegocioError("O produto não tem ficha técnica: cadastre os insumos antes de produzir.");
      if (faltas.length) throw new FaltaInsumosError(faltas);
      for (const n of necessidade) {
        await registrarMovimentacaoTx(tx, {
          insumoId: n.insumoId,
          tipo: "SAIDA_PRODUCAO",
          quantidade: n.quantidade,
          motivo: `Produção do pedido #${id}`,
          pedidoId: id,
        });
      }
    }

    if (estornaEstoque(atual, novo)) {
      const movs = await tx.movimentacao.findMany({ where: { pedidoId: id } });
      const devolver = quantidadesAEstornar(movs.map((m) => ({ ...m, tipo: m.tipo as TipoMovimentacao })));
      // O estorno volta pelo custo médio atual; não altera o custo médio do insumo.
      for (const n of devolver) {
        await registrarMovimentacaoTx(tx, {
          insumoId: n.insumoId,
          tipo: "ESTORNO",
          quantidade: n.quantidade,
          motivo: `Estorno do pedido #${id} cancelado`,
          pedidoId: id,
        });
      }
    }

    return tx.pedido.update({
      where: { id },
      data: { status: novo, concluidoEm: novo === "CONCLUIDO" ? new Date() : undefined },
    });
  });
}

export type FiltroPedidos = { id?: number; status?: string; produtoId?: number; cliente?: string };

export async function listarPedidos(f: FiltroPedidos = {}) {
  const where: Prisma.PedidoWhereInput = {
    id: f.id,
    status: f.status || undefined,
    produtoId: f.produtoId,
    cliente: f.cliente ? { contains: f.cliente, mode: "insensitive" } : undefined,
  };
  const [itens, total] = await Promise.all([
    prisma.pedido.findMany({
      where,
      include: { produto: { select: { id: true, nome: true } } },
      orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
      take: 200,
    }),
    prisma.pedido.count({ where }),
  ]);

  // Para quem aguarda arte, antecipa se haverá insumo suficiente para produzir.
  const faltas = new Map<number, FaltaDetalhada[]>();
  for (const p of itens.filter((p) => p.status === "AGUARDANDO_ARTE")) {
    faltas.set(p.id, (await faltasParaProduzir(prisma, p.produtoId, p.quantidade)).faltas);
  }
  return { itens: itens.map((p) => ({ ...p, faltas: faltas.get(p.id) ?? [] })), total };
}

export function contarPorStatus() {
  return prisma.pedido.groupBy({ by: ["status"], _count: true });
}
