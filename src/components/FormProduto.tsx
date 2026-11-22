"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/lib/validacao/comum";
import { AvisoFormulario, Campo } from "./Campo";

type Valores = { nome: string; custoOperacional: number; margemAlvo: number; precoVenda: number | null };

/** Dados do produto. Margem é exibida em % (0,4 → 40). */
export function FormProduto({
  action,
  valores,
  precoSugerido,
}: {
  action: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  valores?: Valores;
  precoSugerido?: number;
}) {
  const [estado, enviar, pendente] = useActionState(action, {});
  const e = estado.erros ?? {};
  const inicial: Record<string, string> = {
    nome: valores?.nome ?? "",
    custoOperacional: String(valores?.custoOperacional ?? 0).replace(".", ","),
    margemAlvo: String(Math.round((valores?.margemAlvo ?? 0.4) * 1000) / 10).replace(".", ","),
    precoVenda: valores?.precoVenda != null ? String(valores.precoVenda).replace(".", ",") : "",
  };
  const dv = (n: string) => estado.valores?.[n] ?? inicial[n];
  const attrs = (nome: string) => ({
    id: nome,
    name: nome,
    className: "campo",
    defaultValue: dv(nome),
    "aria-invalid": !!e[nome],
    "aria-describedby": e[nome] ? `${nome}-erro` : undefined,
  });

  return (
    <form action={enviar} className="space-y-4">
      <AvisoFormulario {...estado} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nome="nome" rotulo="Nome do produto" erro={e.nome}>
          <input {...attrs("nome")} required />
        </Campo>
        <Campo nome="custoOperacional" rotulo="Custo operacional por unidade (R$)" erro={e.custoOperacional} ajuda="Tempo de mão de obra, energia da prensa/impressora etc.">
          <input {...attrs("custoOperacional")} inputMode="decimal" required />
        </Campo>
        <Campo nome="margemAlvo" rotulo="Margem-alvo (%)" erro={e.margemAlvo} ajuda="Sobre o preço de venda.">
          <input {...attrs("margemAlvo")} inputMode="decimal" required />
        </Campo>
        <Campo
          nome="precoVenda"
          rotulo="Preço praticado (R$)"
          erro={e.precoVenda}
          ajuda={precoSugerido !== undefined ? `Vazio = usar o sugerido (R$ ${precoSugerido.toFixed(2).replace(".", ",")}).` : "Vazio = usar o preço sugerido."}
        >
          <input {...attrs("precoVenda")} inputMode="decimal" />
        </Campo>
      </div>
      <button className="btn-primario" disabled={pendente}>
        {pendente ? "Salvando..." : valores ? "Salvar produto" : "Criar produto"}
      </button>
    </form>
  );
}
