// Tokens dos gráficos (paleta de referência validada para daltonismo, modo claro).
export const COR = {
  serie1: "#2a78d6", // azul
  serie2: "#eb6834", // laranja
  negativo: "#e34948", // polo vermelho do par divergente
  grade: "#e1e0d9",
  eixo: "#c3c2b7",
  textoMudo: "#898781",
  texto: "#52514e",
};

export const eixoProps = {
  stroke: COR.eixo,
  tick: { fill: COR.textoMudo, fontSize: 12 },
  tickLine: false,
} as const;

export const tooltipProps = {
  cursor: { fill: "rgba(11,11,11,0.04)" },
  contentStyle: { borderRadius: 8, border: "1px solid rgba(11,11,11,0.10)", fontSize: 12 },
  labelStyle: { color: "#0b0b0b", fontWeight: 600 },
} as const;
