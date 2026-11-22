// Formatação para exibição em pt-BR.

const moedaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numeroFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const dataFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const dataHoraFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const moeda = (n: number) => moedaFmt.format(n);
export const numero = (n: number) => numeroFmt.format(n);
export const data = (d: Date) => dataFmt.format(d);
export const dataHora = (d: Date) => dataHoraFmt.format(d);
export const percentual = (n: number) => `${numeroFmt.format(Math.round(n * 1000) / 10)}%`;

export const ROTULO_TIPO_MOVIMENTACAO: Record<string, string> = {
  ENTRADA: "Entrada (compra)",
  SAIDA_PRODUCAO: "Saída p/ produção",
  PERDA: "Perda",
  AJUSTE: "Ajuste (inventário)",
  ESTORNO: "Estorno",
};

export const ROTULO_STATUS: Record<string, string> = {
  AGUARDANDO_ARTE: "Aguardando arte",
  EM_PRODUCAO: "Em produção",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

/** Data local no formato do <input type="date"> (AAAA-MM-DD). */
export function paraInputData(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
