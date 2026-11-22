"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { percentual } from "@/lib/formatacao";
import { COR, eixoProps, tooltipProps } from "./tema";

type Item = { nome: string; margemReal: number; margemAlvo: number };

/** Ranking de produtos por margem real, ao lado da margem-alvo de cada um. */
export function GraficoMargens({ dados }: { dados: Item[] }) {
  if (dados.length === 0) return <p className="text-sm text-slate-500">Nenhum produto cadastrado.</p>;
  // Nome curto no eixo; completo no tooltip.
  const linhas = dados.map((d) => ({ ...d, curto: d.nome.replace(/ personalizad[ao]$/i, "") }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={linhas} margin={{ left: 0, right: 8 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={COR.grade} />
        <XAxis dataKey="curto" {...eixoProps} interval={0} tick={{ ...eixoProps.tick, fontSize: 11 }} />
        <YAxis {...eixoProps} tickFormatter={(v: number) => percentual(v)} width={48} />
        <Tooltip
          {...tooltipProps}
          labelFormatter={(_l, p) => (p?.[0]?.payload as Item | undefined)?.nome ?? ""}
          formatter={(v, nome) => [percentual(Number(v)), nome]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" formatter={(v) => <span style={{ color: COR.texto }}>{v}</span>} />
        <Bar dataKey="margemReal" name="Margem real" fill={COR.serie1} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        <Bar dataKey="margemAlvo" name="Margem-alvo" fill={COR.serie2} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
