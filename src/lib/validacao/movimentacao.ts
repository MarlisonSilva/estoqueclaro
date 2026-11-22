import { z } from "zod";
import { paraInputData } from "@/lib/formatacao";
import { numeroBR, textoOpcional } from "./comum";

// Tipos que o gestor lança à mão. ESTORNO só é gerado pelo cancelamento de pedido.
export const TIPOS_MANUAIS = ["ENTRADA", "SAIDA_PRODUCAO", "PERDA", "AJUSTE"] as const;

// Data de hoje vira "agora" (mantém a ordem do histórico); datas passadas ficam ao meio-dia.
const dataOpcional = z.preprocess(
  (v) => {
    if (typeof v !== "string" || !v) return undefined;
    return v === paraInputData(new Date()) ? new Date() : new Date(`${v}T12:00:00`);
  },
  z
    .date({ invalid_type_error: "Data inválida" })
    .refine((d) => !isNaN(d.getTime()), "Data inválida")
    .refine((d) => d.getTime() <= Date.now() + 86400000, "Data no futuro")
    .optional(),
);

/**
 * Movimentação manual. Para AJUSTE o gestor informa a quantidade CONTADA no inventário;
 * o service calcula a diferença para o saldo atual.
 */
export const movimentacaoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("ENTRADA"),
    insumoId: z.coerce.number().int().positive("Escolha o insumo"),
    quantidade: numeroBR().pipe(z.number().min(0.001, "Mínimo 0,001")),
    custoUnitario: numeroBR().pipe(z.number().min(0, "Não pode ser negativo")),
    motivo: textoOpcional(200),
    data: dataOpcional,
  }),
  z.object({
    tipo: z.enum(["SAIDA_PRODUCAO", "PERDA"]),
    insumoId: z.coerce.number().int().positive("Escolha o insumo"),
    quantidade: numeroBR().pipe(z.number().min(0.001, "Mínimo 0,001")),
    motivo: textoOpcional(200),
    data: dataOpcional,
  }),
  z.object({
    tipo: z.literal("AJUSTE"),
    insumoId: z.coerce.number().int().positive("Escolha o insumo"),
    quantidadeContada: numeroBR().pipe(z.number().min(0, "Não pode ser negativo")),
    motivo: textoOpcional(200),
    data: dataOpcional,
  }),
]);

export type MovimentacaoManual = z.infer<typeof movimentacaoSchema>;
