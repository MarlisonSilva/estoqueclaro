import { GraficoPrevisao } from "@/components/graficos/GraficoPrevisao";
import { moeda, numero, percentual } from "@/lib/formatacao";
import { KS, MESES_HISTORICO } from "@/lib/regras/previsao";
import { listarInsumos } from "@/services/insumos";
import { previsoesDeConsumo } from "@/services/previsao";

export const dynamic = "force-dynamic";

export default async function PrevisaoPage({ searchParams }: { searchParams: Promise<{ insumo?: string }> }) {
  const { insumo: param } = await searchParams;
  const insumos = await listarInsumos();
  const escolhido = insumos.find((i) => String(i.id) === param) ?? insumos[0];
  const [previsao] = escolhido ? await previsoesDeConsumo({ insumoId: escolhido.id }) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo">Previsão de consumo</h1>
        <p className="text-sm text-slate-500">
          Média móvel simples sobre o consumo mensal (saídas de produção + perdas − estornos) dos últimos {MESES_HISTORICO} meses completos. O mês atual fica de fora.
        </p>
      </div>

      <form className="cartao flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="f-insumo" className="rotulo">Insumo</label>
          <select id="f-insumo" name="insumo" defaultValue={escolhido?.id} className="campo">
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>{i.nome}</option>
            ))}
          </select>
        </div>
        <button className="btn-secundario">Ver previsão</button>
      </form>

      {previsao && escolhido && (
        <>
          <section className="cartao space-y-2">
            <h2 className="font-semibold">Consumo mensal ({escolhido.unidade})</h2>
            <GraficoPrevisao dados={previsao.grafico} unidade={escolhido.unidade} melhorK={previsao.melhorK} />
          </section>

          <section className="cartao overflow-x-auto p-0">
            <table className="tabela">
              <thead>
                <tr>
                  <th>k</th>
                  <th className="num">EQM</th>
                  <th className="num">RQEM</th>
                  <th className="num">EAM</th>
                  <th className="num">EPAM</th>
                  <th className="num">Meses avaliados</th>
                </tr>
              </thead>
              <tbody>
                {KS.map((k, i) => {
                  const e = previsao.erros[i];
                  const melhor = previsao.melhorK === k;
                  return (
                    <tr key={k} className={melhor ? "bg-emerald-50 font-semibold" : ""}>
                      <td>{k} meses{melhor && " (menor EQM)"}</td>
                      <td className="num">{e ? numero(e.eqm) : "—"}</td>
                      <td className="num">{e ? numero(e.rqem) : "—"}</td>
                      <td className="num">{e ? numero(e.eam) : "—"}</td>
                      <td className="num">{e?.epam != null ? percentual(e.epam) : "—"}</td>
                      <td className="num">{e?.n ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-slate-500">
              Os três k são comparados nos mesmos meses (do 5º em diante). O EPAM ignora meses sem consumo.
            </p>
          </section>

          <section className="cartao space-y-2">
            <h2 className="font-semibold">Decisão de compra</h2>
            {previsao.decisao ? (
              <>
                <p className="font-mono text-sm">{previsao.decisao.equacao}</p>
                <ul className="list-inside list-disc text-sm text-slate-700">
                  <li>Previsão de {previsao.decisao.rotulo}: <strong>{numero(previsao.decisao.previsao)} {escolhido.unidade}</strong></li>
                  <li>
                    Margem de segurança: {numero(previsao.decisao.z)} × RQEM ({numero(previsao.decisao.rqem)}) ={" "}
                    <strong>{numero(previsao.decisao.margem)} {escolhido.unidade}</strong>
                  </li>
                  <li>Estoque mínimo: {numero(previsao.decisao.estoqueMinimo)} · Saldo atual: {numero(previsao.decisao.saldo)} {escolhido.unidade}</li>
                </ul>
                <p className="text-lg">
                  Compra sugerida:{" "}
                  <strong>{numero(previsao.decisao.compra)} {escolhido.unidade}</strong>
                  {" "}({moeda(previsao.decisao.compra * escolhido.custoUnitario)} pelo custo médio)
                </p>
                <p className="text-xs text-slate-500">
                  compra = previsão + z × RQEM + estoque mínimo − saldo, arredondada para cima e nunca negativa.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Histórico insuficiente: são necessários pelo menos 5 meses completos.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
