// Previsão de consumo mensal por média móvel simples. Funções puras, sem banco.
// Consumo = SAIDA_PRODUCAO + PERDA − ESTORNO (mesma definição de alertas.ts).
import type { TipoMovimentacao } from "./estoque";

export const KS = [2, 3, 4] as const;
/** Índice (base 0) do primeiro mês avaliado: o mês 5. Com k = 4 é a primeira previsão possível. */
export const INICIO_AVALIACAO = 4;
export const MESES_HISTORICO = 12;
export const HORIZONTE_PADRAO = 3;
/** z = 1,645: nível de serviço de ~95% (unilateral). */
export const Z_PADRAO = 1.645;

type MovConsumo = { tipo: TipoMovimentacao; quantidade: number; data: Date };

export type PontoSerie = { mes: string; rotulo: string; valor: number };

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
/** Ex.: "jan/2026". */
export const rotuloMes = (d: Date) => `${NOMES_MES[d.getMonth()]}/${d.getFullYear()}`;
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/**
 * Série mensal de consumo dos `meses` meses completos antes do mês de `hoje`
 * (o mês atual fica de fora: está incompleto). Mais antigo primeiro; mês sem consumo = 0.
 */
export function agruparPorMes(movs: MovConsumo[], hoje: Date, meses = MESES_HISTORICO): PontoSerie[] {
  const linhas = new Map<string, PontoSerie>();
  for (let i = meses; i >= 1; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    linhas.set(chave(d), { mes: chave(d), rotulo: rotuloMes(d), valor: 0 });
  }
  for (const m of movs) {
    const l = linhas.get(chave(m.data));
    if (!l) continue;
    if (m.tipo === "SAIDA_PRODUCAO" || m.tipo === "PERDA") l.valor += m.quantidade;
    else if (m.tipo === "ESTORNO") l.valor -= m.quantidade;
  }
  // Estorno de pedido de outro mês pode zerar o consumo líquido, nunca torná-lo negativo.
  return [...linhas.values()].map((l) => ({ ...l, valor: Math.max(0, l.valor) }));
}

/** F(t+1) = [Y(t) + … + Y(t−k+1)] / k. Null se a série tem menos de k meses. */
export function mediaMovel(serie: number[], k: number): number | null {
  if (k < 1 || serie.length < k) return null;
  return serie.slice(-k).reduce((s, y) => s + y, 0) / k;
}

/** Valor ajustado: posição t guarda a previsão de Y(t) feita com os k meses anteriores (null antes disso). */
export function ajustado(serie: number[], k: number): (number | null)[] {
  return serie.map((_, t) => (t < k ? null : mediaMovel(serie.slice(0, t), k)));
}

export type Erros = {
  k: number;
  /** Quantidade de meses avaliados. */
  n: number;
  eqm: number;
  rqem: number;
  eam: number;
  /** Fração (0,25 = 25%); ignora meses com Y = 0. Null se todos forem 0. */
  epam: number | null;
};

/** Erros de previsão do mês 5 em diante (mesmo intervalo para qualquer k). Null se a série tem menos de 5 meses. */
export function erros(serie: number[], k: number): Erros | null {
  const aj = ajustado(serie, k);
  let n = 0, soma2 = 0, somaAbs = 0, somaPerc = 0, nPerc = 0;
  for (let t = INICIO_AVALIACAO; t < serie.length; t++) {
    const e = serie[t] - aj[t]!;
    n++;
    soma2 += e * e;
    somaAbs += Math.abs(e);
    if (serie[t] !== 0) {
      somaPerc += Math.abs(e) / serie[t];
      nPerc++;
    }
  }
  if (n === 0) return null;
  return { k, n, eqm: soma2 / n, rqem: Math.sqrt(soma2 / n), eam: somaAbs / n, epam: nPerc > 0 ? somaPerc / nPerc : null };
}

/** k de menor EQM; empate fica com o menor k. */
export function melhorK(lista: (Erros | null)[]): number | null {
  let melhor: Erros | null = null;
  for (const e of lista) if (e && (!melhor || e.eqm < melhor.eqm)) melhor = e;
  return melhor?.k ?? null;
}

/** Previsão recursiva: cada previsão entra na série para gerar a seguinte. */
export function preverProximos(serie: number[], k: number, n = HORIZONTE_PADRAO): number[] {
  const copia = [...serie];
  const saida: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = mediaMovel(copia, k);
    if (f === null) break;
    saida.push(f);
    copia.push(f);
  }
  return saida;
}

export type DecisaoCompra = {
  rotulo: string;
  k: number;
  previsao: number;
  z: number;
  rqem: number;
  /** z × RQEM: reserva contra o erro da previsão. */
  margem: number;
  estoqueMinimo: number;
  saldo: number;
  compra: number;
  /** Ex.: "F(dez/2026) = (135 + 120) / 2 = 127,5". */
  equacao: string;
};

/** compra = max(0, ⌈previsão + z × RQEM + estoque mínimo − saldo⌉) para o mês seguinte à série. */
export function decisaoCompra(
  serie: number[],
  k: number,
  rqem: number,
  saldo: number,
  estoqueMinimo: number,
  hoje: Date,
  z = Z_PADRAO,
): DecisaoCompra | null {
  const previsao = mediaMovel(serie, k);
  if (previsao === null) return null;
  const margem = z * rqem;
  // toFixed evita que ruído de ponto flutuante (ex.: 65,0000000001) suba a compra uma unidade.
  const compra = Math.max(0, Math.ceil(Number((previsao + margem + estoqueMinimo - saldo).toFixed(6))));
  const rotulo = rotuloMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const termos = serie.slice(-k).reverse().map(fmt).join(" + ");
  return { rotulo, k, previsao, z, rqem, margem, estoqueMinimo, saldo, compra, equacao: `F(${rotulo}) = (${termos}) / ${k} = ${fmt(previsao)}` };
}

export type LinhaGrafico = {
  rotulo: string;
  real?: number;
  k2?: number;
  k3?: number;
  k4?: number;
  previsao?: number;
};

export type AnaliseInsumo = {
  serie: PontoSerie[];
  erros: (Erros | null)[];
  melhorK: number | null;
  previsoes: { rotulo: string; valor: number }[];
  decisao: DecisaoCompra | null;
  grafico: LinhaGrafico[];
};

/** Tudo que a tela precisa para um insumo, a partir do histórico mensal já agrupado. */
export function analisarPrevisao(
  serie: PontoSerie[],
  saldo: number,
  estoqueMinimo: number,
  hoje: Date,
  z = Z_PADRAO,
  horizonte = HORIZONTE_PADRAO,
): AnaliseInsumo {
  const y = serie.map((p) => p.valor);
  const listaErros = KS.map((k) => erros(y, k));
  const k = melhorK(listaErros);
  const prev = k === null ? [] : preverProximos(y, k, horizonte);
  const previsoes = prev.map((valor, i) => ({ rotulo: rotuloMes(new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)), valor }));
  const decisao = k === null ? null : decisaoCompra(y, k, listaErros[KS.indexOf(k as (typeof KS)[number])]!.rqem, saldo, estoqueMinimo, hoje, z);

  const aj = KS.map((kk) => ajustado(y, kk));
  const grafico: LinhaGrafico[] = serie.map((p, t) => ({
    rotulo: p.rotulo,
    real: p.valor,
    k2: aj[0][t] ?? undefined,
    k3: aj[1][t] ?? undefined,
    k4: aj[2][t] ?? undefined,
    // A linha tracejada nasce no último mês real para ficar ligada à série.
    previsao: previsoes.length > 0 && t === serie.length - 1 ? p.valor : undefined,
  }));
  for (const p of previsoes) grafico.push({ rotulo: p.rotulo, previsao: p.valor });

  return { serie, erros: listaErros, melhorK: k, previsoes, decisao, grafico };
}
