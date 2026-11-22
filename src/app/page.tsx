import Link from "next/link";
import { GraficoConsumo } from "@/components/graficos/GraficoConsumo";
import { GraficoMargens } from "@/components/graficos/GraficoMargens";
import { TabelaAlertas } from "@/components/TabelaAlertas";
import { moeda, percentual } from "@/lib/formatacao";
import { dadosDashboard } from "@/services/alertas";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const d = await dadosDashboard();
  const c = d.cards;
  const emAlerta = c.vermelhos + c.amarelos;

  const cards = [
    {
      rotulo: "Insumos em alerta",
      valor: `${emAlerta} de ${c.totalInsumos}`,
      detalhe: `${c.vermelhos} crítico(s), ${c.amarelos} no ponto de pedido`,
      href: "/alertas",
      destaque: c.vermelhos > 0,
    },
    { rotulo: "Valor total em estoque", valor: moeda(c.valorEstoque), detalhe: "saldo × custo médio", href: "/insumos" },
    { rotulo: "Pedidos em produção", valor: String(c.emProducao), detalhe: `${c.aguardandoArte} aguardando arte`, href: "/pedidos?status=EM_PRODUCAO" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="titulo">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((k) => (
          <Link key={k.rotulo} href={k.href} className="cartao block hover:border-slate-300">
            <p className="text-sm text-slate-500">{k.rotulo}</p>
            <p className={`text-3xl font-semibold ${k.destaque ? "text-red-700" : ""}`}>{k.valor}</p>
            <p className="text-xs text-slate-500">{k.detalhe}</p>
          </Link>
        ))}
      </div>

      <section className="cartao space-y-3 p-0 pt-4">
        <div className="flex items-center justify-between px-4">
          <h2 className="font-semibold">Comprar hoje</h2>
          <Link href="/alertas" className="text-sm text-emerald-700 hover:underline">Todos os alertas</Link>
        </div>
        <TabelaAlertas alertas={d.comprarHoje} compacta />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="cartao space-y-2">
          <h2 className="font-semibold">Consumo por insumo — últimos 30 dias (R$)</h2>
          <GraficoConsumo dados={d.consumo} />
        </section>
        <section className="cartao space-y-2">
          <h2 className="font-semibold">Ranking de produtos por margem real</h2>
          <GraficoMargens dados={d.margens} />
          <ol className="space-y-1 text-sm">
            {d.margens.map((m, i) => (
              <li key={m.nome} className="flex justify-between gap-2">
                <span>{i + 1}. {m.nome}</span>
                <span className={`tabular-nums ${m.abaixoDaMeta ? "font-semibold text-red-700" : ""}`}>
                  {percentual(m.margemReal)} {m.abaixoDaMeta && "· abaixo da meta"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
