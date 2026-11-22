import Link from "next/link";
import { FormProduto } from "@/components/FormProduto";
import { moeda, percentual } from "@/lib/formatacao";
import { listarProdutosComAnalise } from "@/services/produtos";
import { criarProdutoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ inativos?: string }> }) {
  const { inativos } = await searchParams;
  const produtos = await listarProdutosComAnalise(inativos === "1");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">Fichas técnicas</h1>
        <Link href={inativos === "1" ? "/produtos" : "/produtos?inativos=1"} className="text-sm text-slate-500 hover:underline">
          {inativos === "1" ? "Ocultar inativos" : "Mostrar inativos"}
        </Link>
      </div>

      <div className="cartao overflow-x-auto p-0">
        <table className="tabela">
          <thead>
            <tr>
              <th>Produto</th>
              <th className="num">Insumos</th>
              <th className="num">Custo real</th>
              <th className="num">dos quais perda</th>
              <th className="num">Preço sugerido</th>
              <th className="num">Preço praticado</th>
              <th className="num">Margem-alvo</th>
              <th className="num">Margem real</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => {
              const a = p.analise;
              return (
                <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                  <td>
                    <Link href={`/produtos/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                      {p.nome}
                    </Link>
                    {!p.ativo && <span className="ml-2 text-xs text-slate-500">(inativo)</span>}
                  </td>
                  <td className="num">{p.itens.length}</td>
                  <td className="num">{moeda(a.custoTotal)}</td>
                  <td className="num text-slate-500">{moeda(a.custoPerda)}</td>
                  <td className="num">{moeda(a.precoSugerido)}</td>
                  <td className="num">{a.precoInformado ? moeda(a.precoPraticado) : <span className="text-slate-400">= sugerido</span>}</td>
                  <td className="num">{percentual(a.margemAlvo)}</td>
                  <td className={`num font-semibold ${a.abaixoDaMeta ? "text-red-600" : "text-emerald-700"}`}>
                    {a.margemReal === null ? "—" : percentual(a.margemReal)}
                  </td>
                </tr>
              );
            })}
            {produtos.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Custo real = insumos (com a perda de produção) + custo operacional, pelo custo médio atual de cada insumo.
        Margem em vermelho: abaixo da margem-alvo.
      </p>

      <details className="cartao">
        <summary className="cursor-pointer font-semibold">Novo produto</summary>
        <div className="mt-4">
          <FormProduto action={criarProdutoAction} />
        </div>
      </details>
    </div>
  );
}
