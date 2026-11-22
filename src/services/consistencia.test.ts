// Depois de uma sequência realista de operações, o saldo gravado de cada insumo
// deve ser exatamente o saldo reconstruído pelo histórico de movimentações.
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { saldoPorHistorico, type TipoMovimentacao } from "@/lib/regras/estoque";
import { criarInsumo } from "./insumos";
import { registrarInventario, registrarMovimentacao } from "./movimentacoes";
import { criarPedido, mudarStatusPedido } from "./pedidos";

async function limpar() {
  await prisma.movimentacao.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.fichaItem.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.insumo.deleteMany();
}

afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("consistência do estoque", () => {
  it("saldo = soma das movimentações após compras, produção, perdas, inventário e estornos", async () => {
    await limpar();
    const base = { categoria: "Teste", estoqueMinimo: 0, prazoEntregaDias: 5 };
    const caneca = await criarInsumo({ ...base, nome: "Caneca", unidade: "un", quantidadeInicial: 50, custoUnitario: 6.5 });
    const papel = await criarInsumo({ ...base, nome: "Papel", unidade: "folha", quantidadeInicial: 100, custoUnitario: 0.35 });
    const tinta = await criarInsumo({ ...base, nome: "Tinta", unidade: "ml", quantidadeInicial: 300, custoUnitario: 0.45 });
    const produto = await prisma.produto.create({
      data: {
        nome: "Caneca sublimada",
        custoOperacional: 2.5,
        itens: {
          create: [
            { insumoId: caneca.id, quantidade: 1, perdaPercentual: 0 },
            { insumoId: papel.id, quantidade: 1, perdaPercentual: 0.05 },
            { insumoId: tinta.id, quantidade: 2, perdaPercentual: 0.1 },
          ],
        },
      },
    });

    for (let i = 1; i <= 8; i++) {
      const p = await criarPedido({ produtoId: produto.id, quantidade: i });
      await mudarStatusPedido(p.id, "EM_PRODUCAO");
      await mudarStatusPedido(p.id, i % 3 === 0 ? "CANCELADO" : "CONCLUIDO");
      if (i % 2 === 0) await registrarMovimentacao({ insumoId: papel.id, tipo: "PERDA", quantidade: 1.5 });
      if (i === 4) await registrarMovimentacao({ insumoId: caneca.id, tipo: "ENTRADA", quantidade: 24, custoUnitario: 7 });
    }
    await registrarInventario(tinta.id, 250);
    // Uma tentativa bloqueada não pode deixar rastro.
    const grande = await criarPedido({ produtoId: produto.id, quantidade: 1000 });
    await expect(mudarStatusPedido(grande.id, "EM_PRODUCAO")).rejects.toThrow(/bloqueada/);

    const insumos = await prisma.insumo.findMany({ include: { movimentacoes: true } });
    for (const i of insumos) {
      const historico = saldoPorHistorico(i.movimentacoes.map((m) => ({ tipo: m.tipo as TipoMovimentacao, quantidade: m.quantidade })));
      expect(i.quantidadeEstoque, i.nome).toBeCloseTo(historico, 6);
      expect(i.quantidadeEstoque, i.nome).toBeGreaterThanOrEqual(0);
    }
  });
});
