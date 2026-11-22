"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { numero } from "@/lib/formatacao";
import type { LinhaGrafico } from "@/lib/regras/previsao";
import { COR, eixoProps, tooltipProps } from "./tema";

/** Consumo real, média móvel ajustada (k = 2, 3, 4) e previsão dos próximos meses (tracejada). */
export function GraficoPrevisao({ dados, unidade, melhorK }: { dados: LinhaGrafico[]; unidade: string; melhorK: number | null }) {
  const ajuste = (k: number) => ({ strokeWidth: melhorK === k ? 2 : 1, strokeOpacity: melhorK === k ? 1 : 0.55 });
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={dados} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid vertical={false} stroke={COR.grade} />
        <XAxis dataKey="rotulo" {...eixoProps} />
        <YAxis {...eixoProps} tickFormatter={(v: number) => numero(v)} width={56} />
        <Tooltip {...tooltipProps} formatter={(v, nome) => [`${numero(Math.round(Number(v) * 100) / 100)} ${unidade}`, nome]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line dataKey="real" name="Consumo real" stroke={COR.texto} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        <Line dataKey="k2" name="Ajustado k=2" stroke={COR.serie1} dot={false} isAnimationActive={false} {...ajuste(2)} />
        <Line dataKey="k3" name="Ajustado k=3" stroke={COR.serie2} dot={false} isAnimationActive={false} {...ajuste(3)} />
        <Line dataKey="k4" name="Ajustado k=4" stroke={COR.negativo} dot={false} isAnimationActive={false} {...ajuste(4)} />
        <Line dataKey="previsao" name="Previsão" stroke={COR.serie1} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
