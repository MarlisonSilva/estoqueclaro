"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { numero } from "@/lib/formatacao";
import type { LinhaGrafico } from "@/lib/regras/previsao";
import { COR, eixoProps, tooltipProps } from "./tema";

/** Consumo real, média móvel ajustada (k = 2, 3, 4) e previsão dos próximos meses (tracejada). */
export function GraficoPrevisao({ dados, unidade, melhorK }: { dados: LinhaGrafico[]; unidade: string; melhorK: number | null }) {
  const [ocultas, setOcultas] = useState<string[]>([]);
  const linhas = [
    { chave: "real", nome: "Consumo real", cor: COR.texto },
    { chave: "k2", nome: "Ajustado k=2", cor: COR.serie1 },
    { chave: "k3", nome: "Ajustado k=3", cor: COR.serie2 },
    { chave: "k4", nome: "Ajustado k=4", cor: COR.negativo },
    { chave: "previsao", nome: "Previsão", cor: COR.serie1 },
  ];
  const alternar = (chave: string) =>
    setOcultas((o) => (o.includes(chave) ? o.filter((c) => c !== chave) : [...o, chave]));
  const ajuste = (k: number) => ({ strokeWidth: melhorK === k ? 2 : 1, strokeOpacity: melhorK === k ? 1 : 0.55 });
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {linhas.map((l) => (
          <label key={l.chave} className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={!ocultas.includes(l.chave)} onChange={() => alternar(l.chave)} />
            <span className="inline-block h-0.5 w-4" style={{ background: l.cor }} />
            {l.nome}
          </label>
        ))}
      </div>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={dados} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid vertical={false} stroke={COR.grade} />
        <XAxis dataKey="rotulo" {...eixoProps} />
        <YAxis {...eixoProps} tickFormatter={(v: number) => numero(v)} width={56} />
        <Tooltip {...tooltipProps} formatter={(v, nome) => [`${numero(Math.round(Number(v) * 100) / 100)} ${unidade}`, nome]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line hide={ocultas.includes("real")} dataKey="real" name="Consumo real" stroke={COR.texto} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        <Line hide={ocultas.includes("k2")} dataKey="k2" name="Ajustado k=2" stroke={COR.serie1} dot={false} isAnimationActive={false} {...ajuste(2)} />
        <Line hide={ocultas.includes("k3")} dataKey="k3" name="Ajustado k=3" stroke={COR.serie2} dot={false} isAnimationActive={false} {...ajuste(3)} />
        <Line hide={ocultas.includes("k4")} dataKey="k4" name="Ajustado k=4" stroke={COR.negativo} dot={false} isAnimationActive={false} {...ajuste(4)} />
        <Line hide={ocultas.includes("previsao")} dataKey="previsao" name="Previsão" stroke={COR.serie1} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
