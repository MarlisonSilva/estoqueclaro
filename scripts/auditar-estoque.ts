// Confere se o saldo gravado em cada insumo bate com a soma das movimentações.
// Uso: npm run auditar  (sai com código 1 se houver divergência)
import { PrismaClient } from "@prisma/client";
import { saldoPorHistorico, type TipoMovimentacao } from "../src/lib/regras/estoque";

const prisma = new PrismaClient();

async function main() {
  const insumos = await prisma.insumo.findMany({
    include: { movimentacoes: { select: { tipo: true, quantidade: true } } },
    orderBy: { nome: "asc" },
  });
  let divergencias = 0;
  for (const i of insumos) {
    const historico = saldoPorHistorico(
      i.movimentacoes.map((m) => ({ tipo: m.tipo as TipoMovimentacao, quantidade: m.quantidade })),
    );
    const ok = Math.abs(historico - i.quantidadeEstoque) < 0.001;
    if (!ok) divergencias++;
    console.log(`${ok ? "OK  " : "ERRO"} ${i.nome}: saldo ${i.quantidadeEstoque} | histórico ${historico}`);
  }
  console.log(divergencias ? `${divergencias} divergência(s).` : "Estoque consistente.");
  if (divergencias) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
