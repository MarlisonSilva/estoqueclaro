"use client";

import { useActionState, useState } from "react";
import type { EstadoFormulario } from "@/lib/validacao/comum";
import { AvisoFormulario, Campo } from "./Campo";

type InsumoOpcao = { id: number; nome: string; unidade: string };
type ItemAtual = { insumoId: number; quantidade: number; perdaPercentual: number };

/** Adiciona insumo à ficha; escolher um insumo que já está nela preenche os valores para editar. */
export function FormItemFicha({
  action,
  insumos,
  itensAtuais,
}: {
  action: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  insumos: InsumoOpcao[];
  itensAtuais: ItemAtual[];
}) {
  const [estado, enviar, pendente] = useActionState(action, {});
  const [insumoId, setInsumoId] = useState<number | undefined>();
  const e = estado.erros ?? {};
  const atual = itensAtuais.find((i) => i.insumoId === insumoId);
  const unidade = insumos.find((i) => i.id === insumoId)?.unidade;
  const br = (n: number) => String(n).replace(".", ",");
  // `key` recria os campos ao trocar de insumo, aplicando os valores do item existente.
  const chave = `${insumoId}-${atual?.quantidade}-${atual?.perdaPercentual}`;

  return (
    <form action={enviar} className="space-y-3">
      <AvisoFormulario {...estado} />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-start">
        <Campo nome="insumoId" rotulo="Insumo" erro={e.insumoId}>
          <select id="insumoId" name="insumoId" className="campo" value={insumoId ?? ""} onChange={(ev) => setInsumoId(Number(ev.target.value) || undefined)} required>
            <option value="">Selecione...</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
                {itensAtuais.some((a) => a.insumoId === i.id) ? " (na ficha)" : ""}
              </option>
            ))}
          </select>
        </Campo>
        <Campo nome="quantidade" rotulo={`Qtd. por unidade${unidade ? ` (${unidade})` : ""}`} erro={e.quantidade}>
          <input
            key={`q-${chave}`}
            id="quantidade"
            name="quantidade"
            className="campo"
            inputMode="decimal"
            defaultValue={estado.valores?.quantidade ?? (atual ? br(atual.quantidade) : "")}
            required
          />
        </Campo>
        <Campo nome="perdaPercentual" rotulo="Perda (%)" erro={e.perdaPercentual}>
          <input
            key={`p-${chave}`}
            id="perdaPercentual"
            name="perdaPercentual"
            className="campo"
            inputMode="decimal"
            defaultValue={estado.valores?.perdaPercentual ?? (atual ? br(Math.round(atual.perdaPercentual * 1000) / 10) : "0")}
            required
          />
        </Campo>
        <div className="sm:pt-6">
          <button className="btn-primario w-full" disabled={pendente}>
            {atual ? "Atualizar" : "Adicionar"}
          </button>
        </div>
      </div>
    </form>
  );
}
