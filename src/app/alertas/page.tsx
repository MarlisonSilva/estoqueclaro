import Link from "next/link";
import { TabelaAlertas } from "@/components/TabelaAlertas";
import { moeda } from "@/lib/formatacao";
import { COBERTURA_COMPRA_DIAS, JANELA_CONSUMO_DIAS, type Semaforo } from "@/lib/regras/alertas";
import { analisarEstoque } from "@/services/alertas";

export const dynamic = "force-dynamic";

const FILTROS: { valor: "" | Semaforo; rotulo: string }[] = [
  { valor: "", rotulo: "Todos" },
  { valor: "VERMELHO", rotulo: "Críticos" },
  { valor: "AMARELO", rotulo: "Comprar" },
  { valor: "VERDE", rotulo: "Ok" },
];

export default async function AlertasPage({ searchParams }: { searchParams: Promise<{ cor?: string }> }) {
  const { cor = "" } = await searchParams;
  const todos = await analisarEstoque();
  const alertas = cor ? todos.filter((a) => a.semaforo === cor) : todos;
  const totalCompra = todos.reduce((s, a) => s + a.custoSugerido, 0);
  const conta = (c: string) => (c ? todos.filter((a) => a.semaforo === c).length : todos.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo">Alertas e ponto de pedido</h1>
        <p className="text-sm text-slate-500">
          Consumo médio dos últimos {JANELA_CONSUMO_DIAS} dias. Compra sugerida cobre o prazo de entrega + {COBERTURA_COMPRA_DIAS} dias e repõe o estoque mínimo.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por situação">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/alertas?cor=${f.valor}` : "/alertas"}
            aria-current={cor === f.valor ? "page" : undefined}
            className="chip"
          >
            {f.rotulo} ({conta(f.valor)})
          </Link>
        ))}
      </nav>

      <div className="cartao p-0">
        <TabelaAlertas alertas={alertas} />
      </div>
      {totalCompra > 0 && (
        <p className="text-sm text-slate-600">
          Custo estimado de todas as compras sugeridas: <strong>{moeda(totalCompra)}</strong> (pelo custo médio atual).
        </p>
      )}

      <details className="cartao text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-800">Como o semáforo é calculado</summary>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>Consumo médio diário = (saídas de produção + perdas − estornos dos últimos {JANELA_CONSUMO_DIAS} dias) ÷ {JANELA_CONSUMO_DIAS}.</li>
          <li>Dias restantes = saldo ÷ consumo médio diário.</li>
          <li>Ponto de pedido = consumo médio diário × prazo de entrega + estoque mínimo.</li>
          <li><strong>Crítico</strong>: saldo abaixo do mínimo, ou o estoque acaba antes de a compra chegar.</li>
          <li><strong>Comprar</strong>: saldo atingiu o ponto de pedido.</li>
          <li>Compra sugerida = consumo × (prazo + {COBERTURA_COMPRA_DIAS}) + mínimo − saldo.</li>
        </ul>
      </details>
    </div>
  );
}
