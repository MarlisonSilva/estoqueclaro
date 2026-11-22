"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tratarErro } from "@/lib/erros";
import { errosPorCampo, valoresDoForm, type EstadoFormulario } from "@/lib/validacao/comum";
import { insumoCriacaoSchema, insumoEdicaoSchema } from "@/lib/validacao/insumo";
import { atualizarInsumo, criarInsumo, excluirOuDesativarInsumo, reativarInsumo } from "@/services/insumos";

export async function criarInsumoAction(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const r = insumoCriacaoSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error), valores: valoresDoForm(form) };
  let id: number;
  try {
    id = (await criarInsumo(r.data)).id;
  } catch (e) {
    return { ...tratarErro(e), valores: valoresDoForm(form) };
  }
  revalidatePath("/insumos");
  redirect(`/insumos/${id}`);
}

export async function atualizarInsumoAction(id: number, _: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const r = insumoEdicaoSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error), valores: valoresDoForm(form) };
  try {
    await atualizarInsumo(id, r.data);
  } catch (e) {
    return { ...tratarErro(e), valores: valoresDoForm(form) };
  }
  revalidatePath("/insumos");
  revalidatePath(`/insumos/${id}`);
  return { ok: true, mensagem: "Insumo atualizado." };
}

export async function excluirInsumoAction(id: number) {
  const resultado = await excluirOuDesativarInsumo(id);
  revalidatePath("/insumos");
  redirect(resultado === "excluido" ? "/insumos" : `/insumos/${id}`);
}

export async function reativarInsumoAction(id: number) {
  await reativarInsumo(id);
  revalidatePath("/insumos");
  revalidatePath(`/insumos/${id}`);
}
