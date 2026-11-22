"use server";

import { redirect } from "next/navigation";
import { emailPermitido } from "@/lib/emails";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/validacao/comum";

export async function entrarAction(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  // Mesma mensagem para senha errada e e-mail fora da lista: não revela quem tem acesso.
  if (error || !emailPermitido(email)) {
    if (!error) await supabase.auth.signOut();
    return { mensagem: "E-mail ou senha incorretos.", valores: { email } };
  }
  redirect("/");
}

export async function sairAction() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
