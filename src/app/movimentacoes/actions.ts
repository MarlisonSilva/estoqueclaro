"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { tratarErro } from "@/lib/erros";
import { errosPorCampo, valoresDoForm, type EstadoFormulario } from "@/lib/validacao/comum";
import { movimentacaoSchema } from "@/lib/validacao/movimentacao";
import { registrarInventario, registrarMovimentacao } from "@/services/movimentacoes";

export async function registrarMovimentacaoAction(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirUsuario();
  const r = movimentacaoSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error), valores: valoresDoForm(form) };
  const d = r.data;
  try {
    if (d.tipo === "AJUSTE") {
      await registrarInventario(d.insumoId, d.quantidadeContada, d.motivo, d.data);
    } else {
      await registrarMovimentacao({
        insumoId: d.insumoId,
        tipo: d.tipo,
        quantidade: d.quantidade,
        custoUnitario: d.tipo === "ENTRADA" ? d.custoUnitario : undefined,
        motivo: d.motivo,
        data: d.data,
      });
    }
  } catch (e) {
    return { ...tratarErro(e), valores: valoresDoForm(form) };
  }
  revalidatePath("/movimentacoes");
  revalidatePath("/insumos", "layout");
  return { ok: true, mensagem: "Movimentação registrada." };
}
