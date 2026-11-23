"use client";

import { useActionState } from "react";
import type { StatusPedido } from "@/lib/regras/producao";
import type { EstadoFormulario } from "@/lib/validacao/comum";

const ROTULO_ACAO: Record<StatusPedido, string> = {
  AGUARDANDO_ARTE: "",
  EM_PRODUCAO: "Iniciar produção",
  CONCLUIDO: "Concluir",
  CANCELADO: "Cancelar",
};

/** Botões das próximas etapas do pedido; mostra o bloqueio por falta de insumos. */
export function AcoesPedido({
  action,
  proximos,
  emProducao,
}: {
  action: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  proximos: StatusPedido[];
  emProducao: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(action, {});
  if (proximos.length === 0) return null;

  return (
    <form
      action={enviar}
      className="space-y-1"
      onSubmit={(ev) => {
        const destino = (ev.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
        const aviso = emProducao
          ? "Cancelar este pedido? Os insumos já baixados voltam ao estoque (estorno)."
          : "Cancelar este pedido?";
        if (destino === "CANCELADO" && !window.confirm(aviso)) ev.preventDefault();
      }}
    >
      <div className="flex flex-wrap gap-1">
        {proximos.map((s) => (
          <button
            key={s}
            name="status"
            value={s}
            disabled={pendente}
            className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
              s === "CANCELADO" ? "border border-red-300 text-red-700 hover:bg-red-50" : "bg-marca text-white hover:bg-marca-escura"
            }`}
          >
            {ROTULO_ACAO[s]}
          </button>
        ))}
      </div>
      {estado.mensagem && !estado.ok && (
        <p className="max-w-xs text-xs text-red-700" role="alert">
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
