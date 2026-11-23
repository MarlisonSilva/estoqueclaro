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

  const custoCompras = d.comprarHoje.reduce((t, a) => t + a.custoSugerido, 0);
  const tom = c.vermelhos > 0
    ? { faixa: "bg-red-700", texto: "Há insumos críticos: compre hoje para não parar a produção." }
    : emAlerta > 0
      ? { faixa: "bg-amber-600", texto: "Alguns insumos chegaram ao ponto de pedido." }
      : { faixa: "bg-marca", texto: "Estoque saudável. Nada para comprar hoje." };

  const cards = [
    { rotulo: "Valor em estoque", valor: moeda(c.valorEstoque), detalhe: "saldo × custo médio", href: "/insumos" },
    { rotulo: "Pedidos em produção", valor: String(c.emProducao), detalhe: `${c.aguardandoArte} aguardando arte`, href: "/pedidos?status=EM_PRODUCAO" },
    { rotulo: "Insumos monitorados", valor: String(c.totalInsumos), detalhe: `${c.totalInsumos - emAlerta} em dia`, href: "/insumos" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="titulo">Dashboard</h1>

      {/* Destaque único: a decisão do dia. Cor da faixa = gravidade. */}
      <section className={`${tom.faixa} flex flex-wrap items-center justify-between gap-4 rounded-xl p-6 text-white`}>
        <div>
          <p className="text-sm font-medium text-white/80">{tom.texto}</p>
          <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums">
            {emAlerta} <span className="text-xl font-semibold text-white/80">de {c.totalInsumos} insumos precisam de compra</span>
          </p>
          <p className="mt-2 text-sm text-white/80">
            {c.vermelhos} crítico(s) · {c.amarelos} no ponto de pedido
            {custoCompras > 0 && <> · compra sugerida de <strong className="text-white">{moeda(custoCompras)}</strong></>}
          </p>
        </div>
        {emAlerta > 0 && (
          <Link href="/alertas" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-tinta hover:bg-slate-100">
            Ver o que comprar
          </Link>
        )}
      </section>

      <section className="cartao space-y-3 p-0 pt-5">
        <div className="flex items-center justify-between px-5">
          <h2 className="secao">Comprar hoje</h2>
          <Link href="/alertas" className="link-acao">Todos os alertas</Link>
        </div>
        <TabelaAlertas alertas={d.comprarHoje} compacta />
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((k) => (
          <Link key={k.rotulo} href={k.href} className="cartao block hover:border-slate-300">
            <p className="text-sm text-slate-500">{k.rotulo}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-tinta">{k.valor}</p>
            <p className="text-xs text-slate-500">{k.detalhe}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="cartao space-y-2">
          <h2 className="secao">Consumo por insumo — últimos 30 dias (R$)</h2>
          <GraficoConsumo dados={d.consumo} />
        </section>
        <section className="cartao space-y-2">
          <h2 className="secao">Ranking de produtos por margem real</h2>
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
