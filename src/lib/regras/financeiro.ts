// Regra pura do financeiro simples: ganhos (vendas concluídas) e gastos (compras de insumos) por mês.
import { arredondarDinheiro } from "./estoque";

export type Lancamento = { data: Date; valor: number };

export type ResumoMes = {
  /** AAAA-MM */
  mes: string;
  /** Ex.: "out/26" */
  rotulo: string;
  ganhos: number;
  gastos: number;
  resultado: number;
};

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Primeiro instante do mês mais antigo da janela (mês atual + `meses − 1` anteriores). */
export function inicioDaJanela(hoje: Date, meses = 12): Date {
  return new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1);
}

/** Agrupa por mês os últimos `meses` meses (incluindo o atual), do mais antigo ao mais recente. */
export function resumoMensal(vendas: Lancamento[], compras: Lancamento[], hoje: Date, meses = 12): ResumoMes[] {
  const linhas = new Map<string, ResumoMes>();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    linhas.set(chave(d), {
      mes: chave(d),
      rotulo: `${NOMES_MES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      ganhos: 0,
      gastos: 0,
      resultado: 0,
    });
  }
  for (const v of vendas) {
    const l = linhas.get(chave(v.data));
    if (l) l.ganhos += v.valor;
  }
  for (const c of compras) {
    const l = linhas.get(chave(c.data));
    if (l) l.gastos += c.valor;
  }
  return [...linhas.values()].map((l) => ({
    ...l,
    ganhos: arredondarDinheiro(l.ganhos),
    gastos: arredondarDinheiro(l.gastos),
    resultado: arredondarDinheiro(l.ganhos - l.gastos),
  }));
}

export function totais(resumo: ResumoMes[]) {
  const ganhos = arredondarDinheiro(resumo.reduce((s, m) => s + m.ganhos, 0));
  const gastos = arredondarDinheiro(resumo.reduce((s, m) => s + m.gastos, 0));
  return { ganhos, gastos, resultado: arredondarDinheiro(ganhos - gastos) };
}
