import Link from "next/link";
import { moeda, numero } from "@/lib/formatacao";
import { listarCategorias, listarInsumos } from "@/services/insumos";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ busca?: string; categoria?: string; inativos?: string }> };

export default async function InsumosPage({ searchParams }: Props) {
  const f = await searchParams;
  const [insumos, categorias] = await Promise.all([
    listarInsumos({ busca: f.busca, categoria: f.categoria, inativos: f.inativos === "1" }),
    listarCategorias(),
  ]);
  const valorTotal = insumos.reduce((s, i) => s + i.quantidadeEstoque * i.custoUnitario, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">Insumos</h1>
        <Link href="/insumos/novo" className="btn-primario">
          Novo insumo
        </Link>
      </div>

      {/* Filtros via GET: funcionam sem JavaScript e ficam na URL. */}
      <form className="cartao grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div>
          <label htmlFor="busca" className="rotulo">Buscar por nome</label>
          <input id="busca" name="busca" defaultValue={f.busca} className="campo" placeholder="Ex.: papel" />
        </div>
        <div>
          <label htmlFor="categoria" className="rotulo">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={f.categoria ?? ""} className="campo">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm sm:pb-2">
          <input type="checkbox" name="inativos" value="1" defaultChecked={f.inativos === "1"} /> Mostrar inativos
        </label>
        <button className="btn-secundario">Filtrar</button>
      </form>

      <div className="cartao overflow-x-auto p-0">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th className="num">Saldo</th>
              <th className="num">Mínimo</th>
              <th className="num">Custo unit.</th>
              <th className="num">Valor em estoque</th>
              <th className="num">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((i) => {
              const abaixo = i.quantidadeEstoque < i.estoqueMinimo;
              return (
                <tr key={i.id} className={i.ativo ? "" : "opacity-50"}>
                  <td>
                    <Link href={`/insumos/${i.id}`} className="font-medium text-marca hover:underline">
                      {i.nome}
                    </Link>
                    {!i.ativo && <span className="ml-2 text-xs text-slate-500">(inativo)</span>}
                  </td>
                  <td>{i.categoria}</td>
                  <td className={`num ${abaixo ? "font-semibold text-red-600" : ""}`} title={abaixo ? "Abaixo do mínimo" : undefined}>
                    {numero(i.quantidadeEstoque)} {i.unidade}
                  </td>
                  <td className="num">{numero(i.estoqueMinimo)}</td>
                  <td className="num">{moeda(i.custoUnitario)}</td>
                  <td className="num">{moeda(i.quantidadeEstoque * i.custoUnitario)}</td>
                  <td className="num">{i.prazoEntregaDias} d</td>
                </tr>
              );
            })}
            {insumos.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Nenhum insumo encontrado.
                </td>
              </tr>
            )}
          </tbody>
          {insumos.length > 0 && (
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={5} className="px-3 py-2">Total ({insumos.length} insumos)</td>
                <td className="num px-3 py-2">{moeda(valorTotal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
