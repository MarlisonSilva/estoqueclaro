import { z } from "zod";
import { STATUS_PEDIDO } from "@/lib/regras/producao";
import { numeroBR, textoOpcional } from "./comum";

export const pedidoSchema = z.object({
  cliente: textoOpcional(100),
  produtoId: z.coerce.number().int().positive("Escolha o produto"),
  quantidade: numeroBR().pipe(z.number().int("Use números inteiros").min(1, "Mínimo 1").max(10000)),
  // Vazio = preço praticado do produto (ou o sugerido).
  precoUnitario: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    numeroBR().pipe(z.number().min(0, "Não pode ser negativo")).optional(),
  ),
});

export const statusSchema = z.enum(STATUS_PEDIDO);

export type PedidoDados = z.infer<typeof pedidoSchema>;
