// Gravação de movimentações: único caminho que altera o saldo de um insumo.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RegraNegocioError } from "@/lib/erros";
import {
  aplicarMovimento,
  arredondarDinheiro,
  arredondarQtd,
  custoMedioPonderado,
  EstoqueInsuficienteError,
  type TipoMovimentacao,
} from "@/lib/regras/estoque";
import { numero } from "@/lib/formatacao";

export type Tx = Prisma.TransactionClient;

export type NovaMovimentacao = {
  insumoId: number;
  tipo: TipoMovimentacao;
  /** Positiva; em AJUSTE é a diferença com sinal. */
  quantidade: number;
  /** Obrigatório em ENTRADA (custo da compra). Nos demais usa o custo médio atual. */
  custoUnitario?: number;
  motivo?: string;
  data?: Date;
  pedidoId?: number;
};

/**
 * Registra a movimentação e atualiza saldo (e custo médio, se ENTRADA) do insumo.
 * Deve rodar dentro de uma transação: pedidos chamam várias vezes na mesma `tx`.
 *
 * O FOR UPDATE trava a linha do insumo até o fim da transação: duas baixas simultâneas
 * não leem o mesmo saldo.
 */
export async function registrarMovimentacaoTx(tx: Tx, dados: NovaMovimentacao) {
  await tx.$queryRaw`SELECT id FROM "Insumo" WHERE id = ${dados.insumoId} FOR UPDATE`;
  const insumo = await tx.insumo.findUnique({ where: { id: dados.insumoId } });
  if (!insumo) throw new RegraNegocioError("Insumo não encontrado.");

  let novoSaldo: number;
  try {
    novoSaldo = aplicarMovimento(insumo.quantidadeEstoque, dados.tipo, dados.quantidade);
  } catch (e) {
    if (e instanceof EstoqueInsuficienteError) {
      throw new RegraNegocioError(
        `Estoque insuficiente de "${insumo.nome}": saldo ${numero(insumo.quantidadeEstoque)} ${insumo.unidade}, ` +
          `movimento de ${numero(Math.abs(e.delta))} ${insumo.unidade}. O saldo não pode ficar negativo.`,
      );
    }
    throw e;
  }

  let custoMovimento = insumo.custoUnitario;
  let novoCustoMedio = insumo.custoUnitario;
  if (dados.tipo === "ENTRADA") {
    if (dados.custoUnitario === undefined) throw new RegraNegocioError("Informe o custo unitário da compra.");
    custoMovimento = dados.custoUnitario;
    novoCustoMedio = custoMedioPonderado(insumo.quantidadeEstoque, insumo.custoUnitario, dados.quantidade, dados.custoUnitario);
  }

  await tx.insumo.update({
    where: { id: insumo.id },
    data: { quantidadeEstoque: novoSaldo, custoUnitario: novoCustoMedio },
  });

  return tx.movimentacao.create({
    data: {
      insumoId: insumo.id,
      tipo: dados.tipo,
      quantidade: arredondarQtd(dados.quantidade),
      custoUnitario: custoMovimento,
      custoTotal: arredondarDinheiro(Math.abs(dados.quantidade) * custoMovimento),
      motivo: dados.motivo,
      data: dados.data ?? new Date(),
      pedidoId: dados.pedidoId,
    },
  });
}

export function registrarMovimentacao(dados: NovaMovimentacao) {
  return prisma.$transaction((tx) => registrarMovimentacaoTx(tx, dados));
}

/** Inventário: o gestor informa o que contou; gravamos a diferença como AJUSTE. */
export function registrarInventario(insumoId: number, quantidadeContada: number, motivo?: string, data?: Date) {
  return prisma.$transaction(async (tx) => {
    // Trava antes de ler o saldo: a diferença é calculada sobre o saldo que será gravado.
    await tx.$queryRaw`SELECT id FROM "Insumo" WHERE id = ${insumoId} FOR UPDATE`;
    const insumo = await tx.insumo.findUnique({ where: { id: insumoId } });
    if (!insumo) throw new RegraNegocioError("Insumo não encontrado.");
    const diferenca = arredondarQtd(quantidadeContada - insumo.quantidadeEstoque);
    if (diferenca === 0) throw new RegraNegocioError("A contagem confere com o saldo do sistema; nada a ajustar.");
    return registrarMovimentacaoTx(tx, {
      insumoId,
      tipo: "AJUSTE",
      quantidade: diferenca,
      motivo: motivo ?? `Inventário: contados ${numero(quantidadeContada)} ${insumo.unidade}`,
      data,
    });
  });
}

export type FiltroMovimentacoes = {
  insumoId?: number;
  tipo?: string;
  de?: Date;
  ate?: Date;
  limite?: number;
};

export async function listarMovimentacoes(f: FiltroMovimentacoes = {}) {
  const where: Prisma.MovimentacaoWhereInput = {
    insumoId: f.insumoId,
    tipo: f.tipo,
    data: f.de || f.ate ? { gte: f.de, lte: f.ate } : undefined,
  };
  const [itens, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      include: { insumo: { select: { nome: true, unidade: true } } },
      orderBy: [{ data: "desc" }, { id: "desc" }],
      take: f.limite ?? 200,
    }),
    prisma.movimentacao.count({ where }),
  ]);
  return { itens, total };
}

export function listarMovimentacoesDoPedido(pedidoId: number) {
  return prisma.movimentacao.findMany({
    where: { pedidoId },
    include: { insumo: { select: { nome: true, unidade: true } } },
    orderBy: [{ data: "asc" }, { id: "asc" }],
  });
}
