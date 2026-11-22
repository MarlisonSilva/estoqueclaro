"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { moeda, numero } from "@/lib/formatacao";
import { COR, eixoProps, tooltipProps } from "./tema";

type Item = { nome: string; unidade: string; valor: number; quantidade: number };

/** Barras horizontais: quanto de cada insumo foi consumido (R$) nos últimos 30 dias. */
export function GraficoConsumo({ dados }: { dados: Item[] }) {
  if (dados.length === 0) return <p className="text-sm text-slate-500">Sem consumo nos últimos 30 dias.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, dados.length * 34)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={4}>
        <CartesianGrid horizontal={false} stroke={COR.grade} />
        <XAxis type="number" {...eixoProps} tickFormatter={(v: number) => `R$ ${numero(v)}`} />
        <YAxis type="category" dataKey="nome" {...eixoProps} width={170} tick={{ ...eixoProps.tick, fontSize: 11 }} />
        <Tooltip
          {...tooltipProps}
          formatter={(v, _n, item) => [
            `${moeda(Number(v))} (${numero((item.payload as Item).quantidade)} ${(item.payload as Item).unidade})`,
            "Consumo em 30 dias",
          ]}
        />
        <Bar dataKey="valor" fill={COR.serie1} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
