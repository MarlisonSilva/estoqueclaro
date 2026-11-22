"use client";

import { useActionState, useState } from "react";
import { registrarMovimentacaoAction } from "@/app/movimentacoes/actions";
import { numero, paraInputData, ROTULO_TIPO_MOVIMENTACAO } from "@/lib/formatacao";
import { TIPOS_MANUAIS } from "@/lib/validacao/movimentacao";
import { AvisoFormulario, Campo } from "./Campo";

type InsumoOpcao = { id: number; nome: string; unidade: string; quantidadeEstoque: number; custoUnitario: number };

/** Lançamento manual de movimentação. Em AJUSTE, pede a quantidade contada. */
export function FormMovimentacao({ insumos, insumoInicial }: { insumos: InsumoOpcao[]; insumoInicial?: number }) {
  const [estado, enviar, pendente] = useActionState(registrarMovimentacaoAction, {});
  const [tipo, setTipo] = useState<string>("ENTRADA");
  const [insumoId, setInsumoId] = useState<number | undefined>(insumoInicial);
  const e = estado.erros ?? {};
  const insumo = insumos.find((i) => i.id === insumoId);

  // Insumo e tipo são controlados e ficam; os demais voltam vazios após sucesso
  // e com o valor digitado após erro.
  const dv = (nome: string) => estado.valores?.[nome];

  const attrs = (nome: string) => ({
    id: nome,
    name: nome,
    className: "campo",
    "aria-invalid": !!e[nome],
    "aria-describedby": e[nome] ? `${nome}-erro` : undefined,
  });

  return (
    <form action={enviar} className="space-y-4">
      <AvisoFormulario {...estado} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo nome="insumoId" rotulo="Insumo" erro={e.insumoId}>
          <select
            {...attrs("insumoId")}
            value={insumoId ?? ""}
            onChange={(ev) => setInsumoId(Number(ev.target.value) || undefined)}
            required
          >
            <option value="">Selecione...</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo nome="tipo" rotulo="Tipo" erro={e.tipo}>
          <select {...attrs("tipo")} value={tipo} onChange={(ev) => setTipo(ev.target.value)}>
            {TIPOS_MANUAIS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_MOVIMENTACAO[t]}
              </option>
            ))}
          </select>
        </Campo>
        {tipo === "AJUSTE" ? (
          <Campo
            nome="quantidadeContada"
            rotulo={`Quantidade contada${insumo ? ` (${insumo.unidade})` : ""}`}
            erro={e.quantidadeContada}
            ajuda={insumo ? `Saldo no sistema: ${numero(insumo.quantidadeEstoque)} ${insumo.unidade}` : undefined}
          >
            <input {...attrs("quantidadeContada")} inputMode="decimal" defaultValue={dv("quantidadeContada")} required />
          </Campo>
        ) : (
          <Campo
            nome="quantidade"
            rotulo={`Quantidade${insumo ? ` (${insumo.unidade})` : ""}`}
            erro={e.quantidade}
            ajuda={insumo ? `Saldo atual: ${numero(insumo.quantidadeEstoque)} ${insumo.unidade}` : undefined}
          >
            <input {...attrs("quantidade")} inputMode="decimal" defaultValue={dv("quantidade")} required />
          </Campo>
        )}
        {tipo === "ENTRADA" && (
          <Campo
            nome="custoUnitario"
            rotulo="Custo unitário da compra (R$)"
            erro={e.custoUnitario}
            ajuda={insumo ? `Custo médio atual: R$ ${numero(insumo.custoUnitario)}` : undefined}
          >
            <input {...attrs("custoUnitario")} inputMode="decimal" defaultValue={dv("custoUnitario")} required />
          </Campo>
        )}
        <Campo nome="data" rotulo="Data" erro={e.data}>
          <input {...attrs("data")} type="date" defaultValue={dv("data") ?? paraInputData(new Date())} />
        </Campo>
        <Campo nome="motivo" rotulo="Motivo" erro={e.motivo}>
          <input {...attrs("motivo")} placeholder={tipo === "PERDA" ? "Ex.: impressão com falha" : "Opcional"} defaultValue={dv("motivo")} />
        </Campo>
      </div>
      <button className="btn-primario" disabled={pendente}>
        {pendente ? "Registrando..." : "Registrar movimentação"}
      </button>
    </form>
  );
}
