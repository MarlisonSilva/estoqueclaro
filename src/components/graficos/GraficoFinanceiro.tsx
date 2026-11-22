"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { moeda, numero } from "@/lib/formatacao";
import type { ResumoMes } from "@/lib/regras/financeiro";
import { COR, eixoProps, tooltipProps } from "./tema";

const reais = (v: number) => `R$ ${numero(Math.round(v / 100) / 10)} mil`;

/** Barras agrupadas: ganhos (vendas concluídas) × gastos (compras de insumos) por mês. */
export function GraficoGanhosGastos({ dados }: { dados: ResumoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dados} margin={{ left: 8, right: 8 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={COR.grade} />
        <XAxis dataKey="rotulo" {...eixoProps} tick={{ ...eixoProps.tick, fontSize: 11 }} />
        <YAxis {...eixoProps} tickFormatter={reais} width={84} />
        <Tooltip {...tooltipProps} formatter={(v, nome) => [moeda(Number(v)), nome]} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" formatter={(v) => <span style={{ color: COR.texto }}>{v}</span>} />
        <Bar dataKey="ganhos" name="Ganhos (vendas)" fill={COR.serie1} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        <Bar dataKey="gastos" name="Gastos (compras)" fill={COR.serie2} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Resultado mensal: azul quando positivo, vermelho quando negativo (par divergente). */
export function GraficoResultado({ dados }: { dados: ResumoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} stroke={COR.grade} />
        <XAxis dataKey="rotulo" {...eixoProps} tick={{ ...eixoProps.tick, fontSize: 11 }} />
        <YAxis {...eixoProps} tickFormatter={reais} width={84} />
        <ReferenceLine y={0} stroke={COR.eixo} />
        <Tooltip {...tooltipProps} formatter={(v) => [moeda(Number(v)), "Resultado"]} />
        <Bar dataKey="resultado" name="Resultado" radius={4} maxBarSize={28} isAnimationActive={false}>
          {dados.map((m) => (
            <Cell key={m.mes} fill={m.resultado >= 0 ? COR.serie1 : COR.negativo} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
