import Link from "next/link";
import { notFound } from "next/navigation";
import { FormInsumo } from "@/components/FormInsumo";
import { FormMovimentacao } from "@/components/FormMovimentacao";
import { TabelaMovimentacoes } from "@/components/TabelaMovimentacoes";
import { moeda, numero } from "@/lib/formatacao";
import { listarCategorias, obterInsumo } from "@/services/insumos";
import { atualizarInsumoAction, excluirInsumoAction, reativarInsumoAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function InsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [insumo, categorias] = await Promise.all([obterInsumo(id), listarCategorias()]);
  if (!insumo) notFound();

  // Só os campos que os formulários (client components) precisam.
  const opcao = { id: insumo.id, nome: insumo.nome, unidade: insumo.unidade, quantidadeEstoque: insumo.quantidadeEstoque, custoUnitario: insumo.custoUnitario };
  const dados = { nome: insumo.nome, categoria: insumo.categoria, unidade: insumo.unidade, estoqueMinimo: insumo.estoqueMinimo, prazoEntregaDias: insumo.prazoEntregaDias };
  const usado = insumo._count.movimentacoes > 0 || insumo.fichaItens.length > 0;
  const resumo = [
    { rotulo: "Saldo", valor: `${numero(insumo.quantidadeEstoque)} ${insumo.unidade}`, alerta: insumo.quantidadeEstoque < insumo.estoqueMinimo },
    { rotulo: "Mínimo", valor: `${numero(insumo.estoqueMinimo)} ${insumo.unidade}` },
    { rotulo: "Custo médio", valor: moeda(insumo.custoUnitario) },
    { rotulo: "Valor em estoque", valor: moeda(insumo.quantidadeEstoque * insumo.custoUnitario) },
  ];

  return (
    <div className="space-y-6">
      <Link href="/insumos" className="text-sm text-slate-500 hover:underline">
        ← Insumos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">
          {insumo.nome}
          {!insumo.ativo && <span className="ml-2 text-base font-normal text-slate-500">(inativo)</span>}
        </h1>
        {insumo.ativo ? (
          <form action={excluirInsumoAction.bind(null, id)}>
            <button className="btn-perigo" title={usado ? "Tem histórico: será apenas desativado" : "Nunca foi usado: será excluído"}>
              {usado ? "Desativar" : "Excluir"}
            </button>
          </form>
        ) : (
          <form action={reativarInsumoAction.bind(null, id)}>
            <button className="btn-secundario">Reativar</button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {resumo.map((r) => (
          <div key={r.rotulo} className="cartao">
            <p className="text-sm text-slate-500">{r.rotulo}</p>
            <p className={`text-xl font-semibold ${r.alerta ? "text-red-600" : ""}`}>{r.valor}</p>
          </div>
        ))}
      </div>

      {insumo.ativo && (
        <section className="cartao space-y-3">
          <h2 className="font-semibold">Nova movimentação</h2>
          <FormMovimentacao insumos={[opcao]} insumoInicial={insumo.id} />
        </section>
      )}

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Dados do insumo</h2>
        <FormInsumo action={atualizarInsumoAction.bind(null, id)} valores={dados} categorias={categorias} />
      </section>

      {insumo.fichaItens.length > 0 && (
        <section className="cartao space-y-2">
          <h2 className="font-semibold">Usado nas fichas técnicas</h2>
          <ul className="list-inside list-disc text-sm">
            {insumo.fichaItens.map((f) => (
              <li key={f.id}>
                <Link href={`/produtos/${f.produto.id}`} className="text-marca hover:underline">
                  {f.produto.nome}
                </Link>{" "}
                — {numero(f.quantidade)} {insumo.unidade} por unidade
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cartao space-y-3 p-0 pt-4">
        <div className="flex items-center justify-between px-4">
          <h2 className="font-semibold">Últimas movimentações</h2>
          <Link href={`/movimentacoes?insumo=${id}`} className="text-sm text-marca hover:underline">
            Ver todas ({insumo._count.movimentacoes})
          </Link>
        </div>
        <TabelaMovimentacoes itens={insumo.movimentacoes} unidade={insumo.unidade} />
      </section>
    </div>
  );
}
