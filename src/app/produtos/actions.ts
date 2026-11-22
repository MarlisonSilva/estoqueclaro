"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { tratarErro } from "@/lib/erros";
import { errosPorCampo, valoresDoForm, type EstadoFormulario } from "@/lib/validacao/comum";
import { fichaItemSchema, produtoSchema } from "@/lib/validacao/produto";
import {
  atualizarProduto,
  criarProduto,
  excluirOuDesativarProduto,
  reativarProduto,
  removerItemFicha,
  salvarItemFicha,
} from "@/services/produtos";

function revalidar(id?: number) {
  revalidatePath("/produtos");
  if (id) revalidatePath(`/produtos/${id}`);
  revalidatePath("/");
}

export async function criarProdutoAction(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const r = produtoSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error), valores: valoresDoForm(form) };
  let id: number;
  try {
    id = (await criarProduto(r.data)).id;
  } catch (e) {
    return { ...tratarErro(e), valores: valoresDoForm(form) };
  }
  revalidar();
  redirect(`/produtos/${id}`);
}

export async function atualizarProdutoAction(id: number, _: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const r = produtoSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error), valores: valoresDoForm(form) };
  try {
    await atualizarProduto(id, r.data);
  } catch (e) {
    return { ...tratarErro(e), valores: valoresDoForm(form) };
  }
  revalidar(id);
  return { ok: true, mensagem: "Produto atualizado." };
}

export async function salvarItemFichaAction(produtoId: number, _: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const r = fichaItemSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error), valores: valoresDoForm(form) };
  try {
    await salvarItemFicha(produtoId, r.data);
  } catch (e) {
    return { ...tratarErro(e), valores: valoresDoForm(form) };
  }
  revalidar(produtoId);
  return { ok: true, mensagem: "Ficha técnica atualizada." };
}

export async function removerItemFichaAction(produtoId: number, itemId: number) {
  await removerItemFicha(produtoId, itemId);
  revalidar(produtoId);
}

export async function excluirProdutoAction(id: number) {
  const r = await excluirOuDesativarProduto(id);
  revalidar(id);
  redirect(r === "excluido" ? "/produtos" : `/produtos/${id}`);
}

export async function reativarProdutoAction(id: number) {
  await reativarProduto(id);
  revalidar(id);
}
