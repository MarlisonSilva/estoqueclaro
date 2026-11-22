"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { tratarErro } from "@/lib/erros";
import { errosPorCampo, valoresDoForm, type EstadoFormulario } from "@/lib/validacao/comum";
import { pedidoSchema, statusSchema } from "@/lib/validacao/pedido";
import { criarPedido, mudarStatusPedido } from "@/services/pedidos";

function revalidar() {
  for (const p of ["/pedidos", "/", "/alertas", "/financeiro", "/movimentacoes"]) revalidatePath(p);
  revalidatePath("/insumos", "layout");
}

export async function criarPedidoAction(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirUsuario();
  const r = pedidoSchema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error), valores: valoresDoForm(form) };
  try {
    const p = await criarPedido(r.data);
    revalidar();
    return { ok: true, mensagem: `Pedido #${p.id} registrado.` };
  } catch (e) {
    return { ...tratarErro(e), valores: valoresDoForm(form) };
  }
}

export async function mudarStatusAction(id: number, _: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await exigirUsuario();
  const r = statusSchema.safeParse(form.get("status"));
  if (!r.success) return { mensagem: "Status inválido." };
  try {
    await mudarStatusPedido(id, r.data);
  } catch (e) {
    return tratarErro(e);
  }
  revalidar();
  return { ok: true };
}
