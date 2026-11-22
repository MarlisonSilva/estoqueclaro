// Prepara o schema "teste" do Postgres antes dos testes de integração dos services:
// cria as tabelas (db push, sem reset) e esvazia os dados. O schema "public" nunca é tocado.
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { urlDeTeste } from "./url-teste";

export default async function setup() {
  const url = urlDeTeste();
  if (!url.includes("schema=teste")) throw new Error("URL de teste sem schema=teste: abortando para não mexer em dados reais.");
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "pipe", // em caso de erro, a saída vai junto na exceção
  });
  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "teste"."Movimentacao", "teste"."Pedido", "teste"."FichaItem", "teste"."Produto", "teste"."Insumo" RESTART IDENTITY CASCADE',
    );
  } finally {
    await prisma.$disconnect();
  }
}
