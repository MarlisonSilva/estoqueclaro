"use client";

import { useActionState } from "react";
import { entrarAction } from "@/app/login/actions";
import { AvisoFormulario, Campo } from "./Campo";

export function FormLogin() {
  const [estado, enviar, pendente] = useActionState(entrarAction, {});
  return (
    <form action={enviar} className="space-y-4">
      <AvisoFormulario {...estado} />
      <Campo nome="email" rotulo="E-mail">
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={estado.valores?.email} className="campo" />
      </Campo>
      <Campo nome="senha" rotulo="Senha">
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
      </Campo>
      <button className="btn-primario w-full" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
