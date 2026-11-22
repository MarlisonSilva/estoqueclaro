"use client";

import { useActionState, useState } from "react";
import { criarPedidoAction } from "@/app/pedidos/actions";
import { moeda } from "@/lib/formatacao";
import { AvisoFormulario, Campo } from "./Campo";

type ProdutoOpcao = { id: number; nome: string; preco: number };

export function FormPedido({ produtos }: { produtos: ProdutoOpcao[] }) {
  const [estado, enviar, pendente] = useActionState(criarPedidoAction, {});
  const [produtoId, setProdutoId] = useState<number | undefined>();
  const e = estado.erros ?? {};
  const produto = produtos.find((p) => p.id === produtoId);
  const dv = (n: string) => estado.valores?.[n];

  return (
    <form action={enviar} className="space-y-4">
      <AvisoFormulario {...estado} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo nome="cliente" rotulo="Cliente" erro={e.cliente}>
          <input id="cliente" name="cliente" className="campo" defaultValue={dv("cliente")} placeholder="Opcional" />
        </Campo>
        <Campo nome="produtoId" rotulo="Produto" erro={e.produtoId}>
          <select id="produtoId" name="produtoId" className="campo" value={produtoId ?? ""} onChange={(ev) => setProdutoId(Number(ev.target.value) || undefined)} required>
            <option value="">Selecione...</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo nome="quantidade" rotulo="Quantidade" erro={e.quantidade}>
          <input id="quantidade" name="quantidade" type="number" min={1} className="campo" defaultValue={dv("quantidade") ?? 1} required />
        </Campo>
        <Campo nome="precoUnitario" rotulo="Preço unitário (R$)" erro={e.precoUnitario} ajuda={produto ? `Vazio = ${moeda(produto.preco)}` : "Vazio = preço do produto"}>
          <input id="precoUnitario" name="precoUnitario" inputMode="decimal" className="campo" defaultValue={dv("precoUnitario")} />
        </Campo>
      </div>
      <button className="btn-primario" disabled={pendente}>
        {pendente ? "Registrando..." : "Registrar pedido"}
      </button>
    </form>
  );
}
