// Testes de integração: service + transação + banco SQLite de teste.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { criarInsumo } from "./insumos";
import { registrarInventario, registrarMovimentacao } from "./movimentacoes";

async function limpar() {
  await prisma.movimentacao.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.fichaItem.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.insumo.deleteMany();
}

const novoInsumo = (quantidadeInicial = 10, custoUnitario = 10) =>
  criarInsumo({ nome: "Caneca teste", categoria: "Cerâmica", unidade: "un", estoqueMinimo: 5, prazoEntregaDias: 7, quantidadeInicial, custoUnitario });

beforeEach(limpar);
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("registrarMovimentacao", () => {
  it("estoque inicial vira uma ENTRADA rastreável", async () => {
    const i = await novoInsumo(10, 10);
    const movs = await prisma.movimentacao.findMany({ where: { insumoId: i.id } });
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({ tipo: "ENTRADA", quantidade: 10, custoTotal: 100 });
    expect((await prisma.insumo.findUnique({ where: { id: i.id } }))!.quantidadeEstoque).toBe(10);
  });

  it("compra atualiza saldo e custo médio ponderado", async () => {
    const i = await novoInsumo(10, 10);
    await registrarMovimentacao({ insumoId: i.id, tipo: "ENTRADA", quantidade: 30, custoUnitario: 14 });
    const depois = await prisma.insumo.findUnique({ where: { id: i.id } });
    expect(depois).toMatchObject({ quantidadeEstoque: 40, custoUnitario: 13 });
  });

  it("perda usa o custo médio e baixa o saldo", async () => {
    const i = await novoInsumo(10, 10);
    const m = await registrarMovimentacao({ insumoId: i.id, tipo: "PERDA", quantidade: 2, motivo: "Quebrou" });
    expect(m).toMatchObject({ custoUnitario: 10, custoTotal: 20 });
    expect((await prisma.insumo.findUnique({ where: { id: i.id } }))!.quantidadeEstoque).toBe(8);
  });

  it("recusa saldo negativo sem gravar nada", async () => {
    const i = await novoInsumo(3);
    await expect(registrarMovimentacao({ insumoId: i.id, tipo: "SAIDA_PRODUCAO", quantidade: 5 })).rejects.toThrow(/Estoque insuficiente/);
    expect(await prisma.movimentacao.count({ where: { insumoId: i.id } })).toBe(1);
    expect((await prisma.insumo.findUnique({ where: { id: i.id } }))!.quantidadeEstoque).toBe(3);
  });

  it("inventário grava a diferença como AJUSTE", async () => {
    const i = await novoInsumo(10);
    const m = await registrarInventario(i.id, 7);
    expect(m).toMatchObject({ tipo: "AJUSTE", quantidade: -3 });
    expect((await prisma.insumo.findUnique({ where: { id: i.id } }))!.quantidadeEstoque).toBe(7);
    await expect(registrarInventario(i.id, 7)).rejects.toThrow(/confere/);
  });
});
