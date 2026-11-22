import { redirect } from "next/navigation";
import { emailPermitido } from "./emails";
import { criarClienteServidor } from "./supabase/servidor";

/** Usuário logado e permitido, ou null. Valida o token no servidor do Supabase (getUser, não getSession). */
export async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  return emailPermitido(data.user?.email) ? data.user : null;
}

/**
 * Chamar no início de TODA server action: ela é um endpoint público e não passa pelo layout.
 * Fora de try/catch, porque o redirect funciona lançando uma exceção.
 */
export async function exigirUsuario() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}
