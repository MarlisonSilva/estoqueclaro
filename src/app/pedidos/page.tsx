import Link from "next/link";
import { AcoesPedido } from "@/components/AcoesPedido";
import { FormPedido } from "@/components/FormPedido";
import { TabelaMovimentacoes } from "@/components/TabelaMovimentacoes";
import { dataHora, moeda, numero, ROTULO_STATUS } from "@/lib/formatacao";
import { proximosStatus, STATUS_PEDIDO, type StatusPedido } from "@/lib/regras/producao";
import { listarMovimentacoesDoPedido } from "@/services/movimentacoes";
import { listarPedidos } from "@/services/pedidos";
import { listarProdutosComAnalise } from "@/services/produtos";
import { mudarStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const COR_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_ARTE: "bg-amber-100 text-amber-800",
  EM_PRODUCAO: "bg-sky-100 text-sky-800",
  CONCLUIDO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-slate-200 text-slate-600",
};

type Props = { searchParams: Promise<{ id?: string; status?: string; produto?: string; cliente?: string }> };
const idValido = (v?: string) => (v && Number.isInteger(Number(v)) ? Number(v) : undefined);

export default async function PedidosPage({ searchParams }: Props) {
  const f = await searchParams;
  const id = idValido(f.id);
  const [{ itens, total }, produtos, movsPedido] = await Promise.all([
    listarPedidos({ id, status: f.status, produtoId: idValido(f.produto), cliente: f.cliente }),
    listarProdutosComAnalise(),
    id ? listarMovimentacoesDoPedido(id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="titulo">Pedidos</h1>

      <details className="cartao" open={!id && !f.status}>
        <summary className="cursor-pointer font-semibold">Novo pedido</summary>
        <div className="mt-4">
          <FormPedido produtos={produtos.map((p) => ({ id: p.id, nome: p.nome, preco: p.analise.precoPraticado }))} />
        </div>
      </details>

      <form className="cartao grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="f-status" className="rotulo">Status</label>
          <select id="f-status" name="status" defaultValue={f.status ?? ""} className="campo">
            <option value="">Todos</option>
            {STATUS_PEDIDO.map((s) => (
              <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-produto" className="rotulo">Produto</label>
          <select id="f-produto" name="produto" defaultValue={f.produto ?? ""} className="campo">
            <option value="">Todos</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-cliente" className="rotulo">Cliente</label>
          <input id="f-cliente" name="cliente" defaultValue={f.cliente} className="campo" />
        </div>
        <div className="flex gap-2">
          <button className="btn-secundario">Filtrar</button>
          {(id || f.status || f.produto || f.cliente) && (
            <Link href="/pedidos" className="btn-secundario">Limpar</Link>
          )}
        </div>
      </form>

      <div className="cartao p-0">
        <p className="px-4 pt-3 text-sm text-slate-500">
          {total > itens.length ? `Mostrando os ${numero(itens.length)} mais recentes de ${numero(total)}.` : `${numero(total)} pedidos.`}
        </p>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th className="num">Qtd.</th>
                <th className="num">Preço unit.</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => {
                const status = p.status as StatusPedido;
                return (
                  <tr key={p.id} className="align-top">
                    <td>
                      <Link href={`/pedidos?id=${p.id}`} className="text-emerald-700 hover:underline">#{p.id}</Link>
                    </td>
                    <td className="whitespace-nowrap">{dataHora(p.criadoEm)}</td>
                    <td>{p.cliente ?? "—"}</td>
                    <td>
                      <Link href={`/produtos/${p.produto.id}`} className="hover:underline">{p.produto.nome}</Link>
                    </td>
                    <td className="num">{p.quantidade}</td>
                    <td className="num">{moeda(p.precoUnitario)}</td>
                    <td className="num">{moeda(p.precoUnitario * p.quantidade)}</td>
                    <td>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${COR_STATUS[status]}`}>
                        {ROTULO_STATUS[status]}
                      </span>
                      {p.faltas.length > 0 && (
                        <p className="mt-1 max-w-56 text-xs text-red-700" title="Saldo atual não cobre este pedido">
                          Falta: {p.faltas.map((x) => `${x.nome} (${numero(x.falta)} ${x.unidade})`).join(", ")}
                        </p>
                      )}
                    </td>
                    <td>
                      <AcoesPedido
                        action={mudarStatusAction.bind(null, p.id)}
                        proximos={proximosStatus(status)}
                        emProducao={status === "EM_PRODUCAO"}
                      />
                    </td>
                  </tr>
                );
              })}
              {itens.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">Nenhum pedido encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {id && (
        <section className="cartao space-y-3 p-0 pt-4">
          <h2 className="px-4 font-semibold">Movimentações de estoque do pedido #{id}</h2>
          <TabelaMovimentacoes itens={movsPedido} />
        </section>
      )}
    </div>
  );
}
