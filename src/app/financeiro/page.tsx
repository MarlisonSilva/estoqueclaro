import { GraficoGanhosGastos, GraficoResultado } from "@/components/graficos/GraficoFinanceiro";
import { moeda, numero } from "@/lib/formatacao";
import { resumoFinanceiro } from "@/services/financeiro";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const { resumo, totais, vendas } = await resumoFinanceiro();
  const mesAtual = resumo[resumo.length - 1];

  const cards = [
    { rotulo: "Ganhos — 12 meses", valor: moeda(totais.ganhos), detalhe: `${numero(vendas)} pedidos concluídos` },
    { rotulo: "Gastos — 12 meses", valor: moeda(totais.gastos), detalhe: "compras de insumos" },
    { rotulo: "Resultado — 12 meses", valor: moeda(totais.resultado), negativo: totais.resultado < 0 },
    { rotulo: `Resultado — ${mesAtual.rotulo}`, valor: moeda(mesAtual.resultado), detalhe: "mês atual (parcial)", negativo: mesAtual.resultado < 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo">Financeiro</h1>
        <p className="text-sm text-slate-500">
          Ganhos = pedidos concluídos (pela data de conclusão). Gastos = compras de insumos. Visão de caixa simples: não inclui custos fixos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.rotulo} className="cartao">
            <p className="text-sm text-slate-500">{c.rotulo}</p>
            <p className={`text-xl font-semibold ${c.negativo ? "text-red-700" : ""}`}>{c.valor}</p>
            {c.detalhe && <p className="text-xs text-slate-500">{c.detalhe}</p>}
          </div>
        ))}
      </div>

      <section className="cartao space-y-2">
        <h2 className="font-semibold">Ganhos × gastos — últimos 12 meses</h2>
        <GraficoGanhosGastos dados={resumo} />
      </section>

      <section className="cartao space-y-2">
        <h2 className="font-semibold">Resultado mensal</h2>
        <GraficoResultado dados={resumo} />
      </section>

      <section className="cartao overflow-x-auto p-0">
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Ganhos</th>
              <th className="num">Gastos</th>
              <th className="num">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {[...resumo].reverse().map((m) => (
              <tr key={m.mes}>
                <td>{m.rotulo}</td>
                <td className="num">{moeda(m.ganhos)}</td>
                <td className="num">{moeda(m.gastos)}</td>
                <td className={`num font-medium ${m.resultado < 0 ? "text-red-700" : ""}`}>{moeda(m.resultado)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="num px-3 py-2">{moeda(totais.ganhos)}</td>
              <td className="num px-3 py-2">{moeda(totais.gastos)}</td>
              <td className={`num px-3 py-2 ${totais.resultado < 0 ? "text-red-700" : ""}`}>{moeda(totais.resultado)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
