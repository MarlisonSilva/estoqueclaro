// Integração: baixa automática, bloqueio por falta e estorno, contra o banco de teste.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { criarInsumo } from "./insumos";
import { criarPedido, FaltaInsumosError, mudarStatusPedido } from "./pedidos";

async function limpar() {
  await prisma.movimentacao.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.fichaItem.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.insumo.deleteMany();
}

/** Caderno: 40 folhas de miolo (3% de perda) + 1 wire-o. */
async function cenario(saldoMiolo: number, saldoWireo: number) {
  const base = { categoria: "Teste", estoqueMinimo: 0, prazoEntregaDias: 5 };
  const miolo = await criarInsumo({ ...base, nome: "Miolo", unidade: "folha", quantidadeInicial: saldoMiolo, custoUnitario: 0.1 });
  const wireo = await criarInsumo({ ...base, nome: "Wire-o", unidade: "un", quantidadeInicial: saldoWireo, custoUnitario: 1 });
  const produto = await prisma.produto.create({
    data: {
      nome: "Caderno",
      custoOperacional: 5,
      margemAlvo: 0.4,
      itens: {
        create: [
          { insumoId: miolo.id, quantidade: 40, perdaPercentual: 0.03 },
          { insumoId: wireo.id, quantidade: 1, perdaPercentual: 0 },
        ],
      },
    },
  });
  return { miolo, wireo, produto };
}

const saldo = async (id: number) => (await prisma.insumo.findUnique({ where: { id } }))!.quantidadeEstoque;

beforeEach(limpar);
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("mudarStatusPedido", () => {
  it("entrar em produção baixa todos os insumos com perda", async () => {
    const { miolo, wireo, produto } = await cenario(500, 10);
    const p = await criarPedido({ produtoId: produto.id, quantidade: 5 });
    await mudarStatusPedido(p.id, "EM_PRODUCAO");
    expect(await saldo(miolo.id)).toBe(294); // 500 − 40 × 5 × 1,03
    expect(await saldo(wireo.id)).toBe(5);
    const saidas = await prisma.movimentacao.findMany({ where: { pedidoId: p.id } });
    expect(saidas.map((m) => m.tipo)).toEqual(["SAIDA_PRODUCAO", "SAIDA_PRODUCAO"]);
  });

  it("bloqueia a produção, informa o que falta e não grava nada", async () => {
    const { miolo, wireo, produto } = await cenario(500, 3);
    const p = await criarPedido({ produtoId: produto.id, quantidade: 5 });
    const erro = await mudarStatusPedido(p.id, "EM_PRODUCAO").catch((e) => e);
    expect(erro).toBeInstanceOf(FaltaInsumosError);
    expect(erro.faltas).toEqual([expect.objectContaining({ nome: "Wire-o", necessario: 5, disponivel: 3, falta: 2 })]);
    expect(erro.message).toMatch(/Wire-o.*faltam 2/);
    // Nem o miolo (que tinha saldo) foi baixado: a transação inteira voltou.
    expect(await saldo(miolo.id)).toBe(500);
    expect(await saldo(wireo.id)).toBe(3);
    expect((await prisma.pedido.findUnique({ where: { id: p.id } }))!.status).toBe("AGUARDANDO_ARTE");
  });

  it("cancelar pedido em produção estorna a baixa", async () => {
    const { miolo, wireo, produto } = await cenario(500, 10);
    const p = await criarPedido({ produtoId: produto.id, quantidade: 5 });
    await mudarStatusPedido(p.id, "EM_PRODUCAO");
    await mudarStatusPedido(p.id, "CANCELADO");
    expect(await saldo(miolo.id)).toBe(500);
    expect(await saldo(wireo.id)).toBe(10);
    const tipos = (await prisma.movimentacao.findMany({ where: { pedidoId: p.id } })).map((m) => m.tipo).sort();
    expect(tipos).toEqual(["ESTORNO", "ESTORNO", "SAIDA_PRODUCAO", "SAIDA_PRODUCAO"]);
  });

  it("cancelar antes da produção não mexe no estoque", async () => {
    const { miolo, produto } = await cenario(500, 10);
    const p = await criarPedido({ produtoId: produto.id, quantidade: 5 });
    await mudarStatusPedido(p.id, "CANCELADO");
    expect(await saldo(miolo.id)).toBe(500);
    expect(await prisma.movimentacao.count({ where: { pedidoId: p.id } })).toBe(0);
  });

  it("concluir registra a data e pedidos finalizados não mudam mais", async () => {
    const { produto } = await cenario(500, 10);
    const p = await criarPedido({ produtoId: produto.id, quantidade: 1 });
    await mudarStatusPedido(p.id, "EM_PRODUCAO");
    const concluido = await mudarStatusPedido(p.id, "CONCLUIDO");
    expect(concluido.concluidoEm).toBeInstanceOf(Date);
    await expect(mudarStatusPedido(p.id, "CANCELADO")).rejects.toThrow(/Não é possível/);
  });

  it("sem preço informado, usa o sugerido pela ficha", async () => {
    const { produto } = await cenario(500, 10);
    const p = await criarPedido({ produtoId: produto.id, quantidade: 1 });
    // custo: 41,2 × 0,10 + 1 + 5 = 10,12 → ÷ 0,6 = 16,87
    expect(p.precoUnitario).toBe(16.87);
  });
});
