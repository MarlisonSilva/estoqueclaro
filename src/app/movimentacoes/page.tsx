import { FormMovimentacao } from "@/components/FormMovimentacao";
import { TabelaMovimentacoes } from "@/components/TabelaMovimentacoes";
import { numero, ROTULO_TIPO_MOVIMENTACAO } from "@/lib/formatacao";
import { TIPOS_MOVIMENTACAO } from "@/lib/regras/estoque";
import { listarInsumos } from "@/services/insumos";
import { listarMovimentacoes } from "@/services/movimentacoes";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ insumo?: string; tipo?: string; de?: string; ate?: string; nova?: string }> };

function dataFiltro(v: string | undefined, hora: string) {
  const d = v ? new Date(`${v}T${hora}`) : undefined;
  return d && !isNaN(d.getTime()) ? d : undefined;
}

const idValido = (v?: string) => (v && Number.isInteger(Number(v)) ? Number(v) : undefined);

export default async function MovimentacoesPage({ searchParams }: Props) {
  const f = await searchParams;
  const insumoId = idValido(f.insumo);
  const [insumos, { itens, total }] = await Promise.all([
    listarInsumos(),
    listarMovimentacoes({
      insumoId,
      tipo: f.tipo || undefined,
      de: dataFiltro(f.de, "00:00:00"),
      ate: dataFiltro(f.ate, "23:59:59"),
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="titulo">Movimentações de estoque</h1>

      <details className="cartao" open={insumos.length > 0 && (f.nova === "1" || (!f.insumo && !f.tipo))}>
        <summary className="cursor-pointer font-semibold">Nova movimentação</summary>
        <div className="mt-4">
          <FormMovimentacao
            insumos={insumos.map((i) => ({ id: i.id, nome: i.nome, unidade: i.unidade, quantidadeEstoque: i.quantidadeEstoque, custoUnitario: i.custoUnitario }))} insumoInicial={insumoId} />
        </div>
      </details>

      <form className="cartao grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="f-insumo" className="rotulo">Insumo</label>
          <select id="f-insumo" name="insumo" defaultValue={f.insumo ?? ""} className="campo">
            <option value="">Todos</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>{i.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-tipo" className="rotulo">Tipo</label>
          <select id="f-tipo" name="tipo" defaultValue={f.tipo ?? ""} className="campo">
            <option value="">Todos</option>
            {TIPOS_MOVIMENTACAO.map((t) => (
              <option key={t} value={t}>{ROTULO_TIPO_MOVIMENTACAO[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-de" className="rotulo">De</label>
          <input id="f-de" name="de" type="date" defaultValue={f.de} className="campo" />
        </div>
        <div>
          <label htmlFor="f-ate" className="rotulo">Até</label>
          <input id="f-ate" name="ate" type="date" defaultValue={f.ate} className="campo" />
        </div>
        <button className="btn-secundario">Filtrar</button>
      </form>

      <div className="cartao p-0">
        <p className="px-4 pt-3 text-sm text-slate-500">
          {total > itens.length
            ? `Mostrando as ${numero(itens.length)} mais recentes de ${numero(total)}. Use os filtros para refinar.`
            : `${numero(total)} movimentações.`}
        </p>
        <TabelaMovimentacoes itens={itens} />
      </div>
    </div>
  );
}
