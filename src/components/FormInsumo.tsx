"use client";

import { useActionState } from "react";
import { UNIDADES } from "@/lib/regras/estoque";
import type { EstadoFormulario } from "@/lib/validacao/comum";
import { AvisoFormulario, Campo } from "./Campo";

type Valores = {
  nome: string;
  categoria: string;
  unidade: string;
  estoqueMinimo: number;
  prazoEntregaDias: number;
};

/** Cadastro (com saldo/custo iniciais) ou edição (sem saldo/custo) de insumo. */
export function FormInsumo({
  action,
  valores,
  categorias,
}: {
  action: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  valores?: Valores;
  categorias: string[];
}) {
  const [estado, enviar, pendente] = useActionState(action, {});
  const e = estado.erros ?? {};
  const criacao = !valores;
  // Reexibe o que foi digitado quando o envio volta com erro.
  const dv = (nome: keyof Valores | "quantidadeInicial" | "custoUnitario", padrao?: string | number) =>
    estado.valores?.[nome] ?? (valores as Record<string, unknown> | undefined)?.[nome]?.toString() ?? padrao;
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nome="nome" rotulo="Nome" erro={e.nome}>
          <input {...attrs("nome")} defaultValue={dv("nome")} required />
        </Campo>
        <Campo nome="categoria" rotulo="Categoria" erro={e.categoria}>
          <input {...attrs("categoria")} defaultValue={dv("categoria")} list="categorias" required />
          <datalist id="categorias">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Campo>
        <Campo nome="unidade" rotulo="Unidade de medida" erro={e.unidade}>
          <select {...attrs("unidade")} defaultValue={dv("unidade", "un")}>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Campo>
        <Campo nome="estoqueMinimo" rotulo="Estoque mínimo de segurança" erro={e.estoqueMinimo}>
          <input {...attrs("estoqueMinimo")} inputMode="decimal" defaultValue={dv("estoqueMinimo", 0)} required />
        </Campo>
        <Campo nome="prazoEntregaDias" rotulo="Prazo de entrega do fornecedor (dias)" erro={e.prazoEntregaDias}>
          <input {...attrs("prazoEntregaDias")} type="number" min={0} defaultValue={dv("prazoEntregaDias", 7)} required />
        </Campo>
        {criacao && (
          <>
            <Campo nome="quantidadeInicial" rotulo="Quantidade em estoque" erro={e.quantidadeInicial} ajuda="Vira uma entrada “Estoque inicial”.">
              <input {...attrs("quantidadeInicial")} inputMode="decimal" defaultValue={dv("quantidadeInicial", 0)} required />
            </Campo>
            <Campo nome="custoUnitario" rotulo="Custo unitário (R$)" erro={e.custoUnitario}>
              <input {...attrs("custoUnitario")} inputMode="decimal" defaultValue={dv("custoUnitario", 0)} required />
            </Campo>
          </>
        )}
      </div>
      {!criacao && (
        <p className="text-xs text-slate-500">
          Saldo e custo não se editam aqui: use uma movimentação (entrada, perda ou ajuste de inventário).
        </p>
      )}
      <button className="btn-primario" disabled={pendente}>
        {pendente ? "Salvando..." : criacao ? "Cadastrar insumo" : "Salvar alterações"}
      </button>
    </form>
  );
}
