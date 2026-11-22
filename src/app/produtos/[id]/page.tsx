import Link from "next/link";
import { notFound } from "next/navigation";
import { FormItemFicha } from "@/components/FormItemFicha";
import { FormProduto } from "@/components/FormProduto";
import { moeda, numero, percentual } from "@/lib/formatacao";
import { listarInsumos } from "@/services/insumos";
import { obterProdutoComAnalise } from "@/services/produtos";
import {
  atualizarProdutoAction,
  excluirProdutoAction,
  reativarProdutoAction,
  removerItemFichaAction,
  salvarItemFichaAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [produto, insumos] = await Promise.all([obterProdutoComAnalise(id), listarInsumos()]);
  if (!produto) notFound();
  const a = produto.analise;
  const itemPorInsumo = new Map(produto.itens.map((i) => [i.insumoId, i]));

  const cards = [
    { rotulo: "Custo real", valor: moeda(a.custoTotal), detalhe: `insumos ${moeda(a.custoInsumos)} + operacional ${moeda(a.custoOperacional)}` },
    { rotulo: "Preço sugerido", valor: moeda(a.precoSugerido), detalhe: `margem-alvo ${percentual(a.margemAlvo)}` },
    { rotulo: "Preço praticado", valor: moeda(a.precoPraticado), detalhe: a.precoInformado ? `lucro ${moeda(a.lucroUnitario)} por unidade` : "usando o sugerido" },
    {
      rotulo: "Margem real",
      valor: a.margemReal === null ? "—" : percentual(a.margemReal),
      detalhe: a.abaixoDaMeta ? "abaixo da meta" : "dentro da meta",
      cor: a.abaixoDaMeta ? "text-red-600" : "text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      <Link href="/produtos" className="text-sm text-slate-500 hover:underline">
        ← Fichas técnicas
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">
          {produto.nome}
          {!produto.ativo && <span className="ml-2 text-base font-normal text-slate-500">(inativo)</span>}
        </h1>
        {produto.ativo ? (
          <form action={excluirProdutoAction.bind(null, id)}>
            <button className="btn-perigo" title={produto.totalPedidos ? "Tem pedidos: será apenas desativado" : "Sem pedidos: será excluído"}>
              {produto.totalPedidos ? "Desativar" : "Excluir"}
            </button>
          </form>
        ) : (
          <form action={reativarProdutoAction.bind(null, id)}>
            <button className="btn-secundario">Reativar</button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.rotulo} className="cartao">
            <p className="text-sm text-slate-500">{c.rotulo}</p>
            <p className={`text-xl font-semibold ${c.cor ?? ""}`}>{c.valor}</p>
            <p className="text-xs text-slate-500">{c.detalhe}</p>
          </div>
        ))}
      </div>

      {a.precoInformado && a.abaixoDaMeta && (
        <p className="erro">
          O preço praticado ({moeda(a.precoPraticado)}) está abaixo do sugerido ({moeda(a.precoSugerido)}): a margem real é{" "}
          {a.margemReal === null ? "indefinida" : percentual(a.margemReal)}, contra a meta de {percentual(a.margemAlvo)}.
        </p>
      )}

      <section className="cartao space-y-4 p-0 pt-4">
        <div className="px-4">
          <h2 className="font-semibold">Composição por unidade</h2>
          {a.custoPerda > 0 && (
            <p className="text-sm text-slate-500">
              {moeda(a.custoPerda)} de cada unidade são perdas de produção ({percentual(a.custoPerda / a.custoTotal)} do custo).
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Insumo</th>
                <th className="num">Qtd.</th>
                <th className="num">Perda</th>
                <th className="num">Qtd. c/ perda</th>
                <th className="num">Custo unit.</th>
                <th className="num">Custo</th>
                <th className="num">% do custo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {a.itens.map((i) => (
                <tr key={i.insumoId}>
                  <td>
                    <Link href={`/insumos/${i.insumoId}`} className="hover:underline">
                      {i.nome}
                    </Link>
                  </td>
                  <td className="num">{numero(i.quantidade)} {i.unidade}</td>
                  <td className="num">{percentual(i.perdaPercentual)}</td>
                  <td className="num">{numero(i.quantidadeComPerda)} {i.unidade}</td>
                  <td className="num">{moeda(i.custoUnitario)}</td>
                  <td className="num">{moeda(i.custo)}</td>
                  <td className="num">{a.custoTotal > 0 ? percentual(i.custo / a.custoTotal) : "—"}</td>
                  <td className="text-right">
                    <form action={removerItemFichaAction.bind(null, id, itemPorInsumo.get(i.insumoId)!.id)}>
                      <button className="text-xs text-red-600 hover:underline" aria-label={`Remover ${i.nome}`}>
                        remover
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5}>Custo operacional (tempo/energia)</td>
                <td className="num">{moeda(a.custoOperacional)}</td>
                <td className="num">{a.custoTotal > 0 ? percentual(a.custoOperacional / a.custoTotal) : "—"}</td>
                <td />
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={5} className="px-3 py-2">Custo real por unidade</td>
                <td className="num px-3 py-2">{moeda(a.custoTotal)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t border-slate-100 p-4">
          <h3 className="mb-2 text-sm font-semibold">Adicionar ou alterar insumo</h3>
          <FormItemFicha
            action={salvarItemFichaAction.bind(null, id)}
            insumos={insumos.map((i) => ({ id: i.id, nome: i.nome, unidade: i.unidade }))}
            itensAtuais={produto.itens.map((i) => ({ insumoId: i.insumoId, quantidade: i.quantidade, perdaPercentual: i.perdaPercentual }))}
          />
        </div>
      </section>

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Dados do produto</h2>
        <FormProduto
          action={atualizarProdutoAction.bind(null, id)}
          valores={{ nome: produto.nome, custoOperacional: produto.custoOperacional, margemAlvo: produto.margemAlvo, precoVenda: produto.precoVenda }}
          precoSugerido={a.precoSugerido}
        />
      </section>
    </div>
  );
}
