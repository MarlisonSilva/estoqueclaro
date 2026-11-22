import type { ReactNode } from "react";

/** Rótulo + controle + mensagem de erro, com ligação acessível entre eles. */
export function Campo({
  nome,
  rotulo,
  erro,
  ajuda,
  children,
}: {
  nome: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={nome} className="rotulo">
        {rotulo}
      </label>
      {children}
      {ajuda && !erro && <p className="mt-1 text-xs text-slate-500">{ajuda}</p>}
      {erro && (
        <p id={`${nome}-erro`} className="mt-1 text-xs text-red-600" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Mensagem geral de sucesso/erro de um formulário. */
export function AvisoFormulario({ ok, mensagem }: { ok?: boolean; mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p className={ok ? "sucesso" : "erro"} role={ok ? "status" : "alert"}>
      {mensagem}
    </p>
  );
}
