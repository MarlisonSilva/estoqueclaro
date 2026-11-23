import Link from "next/link";
import { dataHora, moeda, numero, ROTULO_TIPO_MOVIMENTACAO } from "@/lib/formatacao";
import { deltaDoMovimento, type TipoMovimentacao } from "@/lib/regras/estoque";

type Linha = {
  id: number;
  tipo: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  motivo: string | null;
  data: Date;
  pedidoId: number | null;
  insumoId: number;
  insumo?: { nome: string; unidade: string };
};

const COR_TIPO: Record<string, string> = {
  ENTRADA: "bg-emerald-100 text-emerald-800",
  ESTORNO: "bg-sky-100 text-sky-800",
  SAIDA_PRODUCAO: "bg-slate-100 text-slate-700",
  PERDA: "bg-red-100 text-red-800",
  AJUSTE: "bg-amber-100 text-amber-800",
};

/** Histórico de movimentações; a coluna de insumo some quando já se está na tela do insumo. */
export function TabelaMovimentacoes({ itens, unidade }: { itens: Linha[]; unidade?: string }) {
  const mostrarInsumo = !unidade;
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Data</th>
            {mostrarInsumo && <th>Insumo</th>}
            <th>Tipo</th>
            <th className="num">Quantidade</th>
            <th className="num">Custo unit.</th>
            <th className="num">Custo total</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((m) => {
            const delta = deltaDoMovimento(m.tipo as TipoMovimentacao, m.quantidade);
            return (
              <tr key={m.id}>
                <td className="whitespace-nowrap">{dataHora(m.data)}</td>
                {mostrarInsumo && (
                  <td>
                    <Link href={`/insumos/${m.insumoId}`} className="hover:underline">
                      {m.insumo?.nome}
                    </Link>
                  </td>
                )}
                <td>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${COR_TIPO[m.tipo] ?? ""}`}>
                    {ROTULO_TIPO_MOVIMENTACAO[m.tipo] ?? m.tipo}
                  </span>
                </td>
                <td className={`num ${delta < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {delta > 0 ? "+" : ""}
                  {numero(delta)} {unidade ?? m.insumo?.unidade}
                </td>
                <td className="num">{moeda(m.custoUnitario)}</td>
                <td className="num">{moeda(m.custoTotal)}</td>
                <td className="min-w-48 text-slate-600">
                  {m.motivo}
                  {m.pedidoId && (
                    <Link href={`/pedidos?id=${m.pedidoId}`} className="ml-1 text-marca hover:underline">
                      ver pedido
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
          {itens.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-slate-500">
                Nenhuma movimentação.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
