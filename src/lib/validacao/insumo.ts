import { z } from "zod";
import { UNIDADES } from "@/lib/regras/estoque";
import { numeroBR } from "./comum";

const camposBase = {
  nome: z.string().trim().min(2, "Nome muito curto").max(100),
  categoria: z.string().trim().min(2, "Informe a categoria").max(50),
  unidade: z.enum(UNIDADES, { errorMap: () => ({ message: "Unidade inválida" }) }),
  estoqueMinimo: numeroBR().pipe(z.number().min(0, "Não pode ser negativo")),
  prazoEntregaDias: numeroBR().pipe(z.number().int("Use dias inteiros").min(0, "Não pode ser negativo").max(365)),
};

// Na edição, saldo e custo não são editáveis: mudam só por movimentação.
export const insumoEdicaoSchema = z.object(camposBase);

// No cadastro, saldo e custo iniciais viram uma ENTRADA "Estoque inicial".
export const insumoCriacaoSchema = z.object({
  ...camposBase,
  quantidadeInicial: numeroBR().pipe(z.number().min(0, "Não pode ser negativo")),
  custoUnitario: numeroBR().pipe(z.number().min(0, "Não pode ser negativo")),
});

export type InsumoCriacao = z.infer<typeof insumoCriacaoSchema>;
export type InsumoEdicao = z.infer<typeof insumoEdicaoSchema>;
