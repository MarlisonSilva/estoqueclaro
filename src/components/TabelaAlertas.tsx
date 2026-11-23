import Link from "next/link";
import type { AlertaInsumo } from "@/lib/regras/alertas";
import { moeda, numero } from "@/lib/formatacao";
import { Semaforo } from "./Semaforo";

const dias = (d: number) => (Number.isFinite(d) ? numero(Math.round(d * 10) / 10) : "sem consumo");

/** Tabela de alertas; `compacta` omite colunas técnicas (usada no dashboard). */
export function TabelaAlertas({ alertas, compacta = false }: { alertas: AlertaInsumo[]; compacta?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Situação</th>
            <th>Insumo</th>
            <th className="num">Saldo</th>
            {!compacta && <th className="num">Mínimo</th>}
            {!compacta && <th className="num">Consumo/dia</th>}
            <th className="num">Dias restantes</th>
            <th className="num">Prazo entrega</th>
            {!compacta && <th className="num">Ponto de pedido</th>}
            <th className="num text-tinta">Comprar</th>
            <th className="num">Custo estimado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => (
            <tr key={a.id}>
              <td>
                <Semaforo cor={a.semaforo} />
              </td>
              <td className="min-w-52">
                <Link href={`/insumos/${a.id}`} className="font-semibold text-tinta hover:underline">
                  {a.nome}
                </Link>
                <p className="text-xs text-slate-500">{a.motivo}</p>
              </td>
              <td className="num">
                {numero(a.quantidadeEstoque)} {a.unidade}
              </td>
              {!compacta && <td className="num">{numero(a.estoqueMinimo)}</td>}
              {!compacta && <td className="num">{numero(Math.round(a.consumoDiario * 100) / 100)}</td>}
              <td className={`num ${a.folgaDias < 0 ? "font-semibold text-red-700" : ""}`}>{dias(a.diasRestantes)}</td>
              <td className="num">{a.prazoEntregaDias} d</td>
              {!compacta && <td className="num">{numero(Math.round(a.pontoPedido * 10) / 10)}</td>}
              <td className="num text-base font-bold text-tinta">{a.quantidadeSugerida > 0 ? `${numero(a.quantidadeSugerida)} ${a.unidade}` : "—"}</td>
              <td className="num">{a.custoSugerido > 0 ? moeda(a.custoSugerido) : "—"}</td>
              <td className="text-right whitespace-nowrap">
                {a.semaforo !== "VERDE" && (
                  <Link href={`/movimentacoes?insumo=${a.id}&nova=1`} className="link-acao">
                    registrar compra
                  </Link>
                )}
              </td>
            </tr>
          ))}
          {alertas.length === 0 && (
            <tr>
              <td colSpan={11} className="py-8 text-center text-slate-500">
                Nada para comprar hoje.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
