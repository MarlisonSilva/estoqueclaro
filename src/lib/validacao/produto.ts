import { z } from "zod";
import { numeroBR } from "./comum";

// No formulário, margem e perda são digitadas em % (40 = 40%); aqui viram fração (0,4).
const percentual = (max: number, msg: string) =>
  numeroBR().pipe(z.number().min(0, "Não pode ser negativo").max(max, msg)).transform((v) => v / 100);

export const produtoSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(100),
  custoOperacional: numeroBR().pipe(z.number().min(0, "Não pode ser negativo")),
  margemAlvo: percentual(95, "Use no máximo 95%"),
  // Vazio = usar o preço sugerido.
  precoVenda: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    numeroBR().pipe(z.number().positive("Deve ser maior que zero")).nullable(),
  ),
});

export const fichaItemSchema = z.object({
  insumoId: z.coerce.number().int().positive("Escolha o insumo"),
  quantidade: numeroBR().pipe(z.number().min(0.001, "Mínimo 0,001")),
  perdaPercentual: percentual(100, "Use no máximo 100%"),
});

export type ProdutoDados = z.infer<typeof produtoSchema>;
export type FichaItemDados = z.infer<typeof fichaItemSchema>;
