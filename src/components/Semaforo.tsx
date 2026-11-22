import type { Semaforo as Cor } from "@/lib/regras/alertas";

// Cores de status fixas; sempre acompanhadas de ícone e rótulo (nunca só a cor).
const ESTILO: Record<Cor, { rotulo: string; icone: string; classe: string }> = {
  VERMELHO: { rotulo: "Crítico", icone: "●", classe: "bg-red-50 text-red-800 ring-red-200 [&>span]:text-[#d03b3b]" },
  AMARELO: { rotulo: "Comprar", icone: "▲", classe: "bg-amber-50 text-amber-900 ring-amber-200 [&>span]:text-[#fab219]" },
  VERDE: { rotulo: "Ok", icone: "✓", classe: "bg-emerald-50 text-emerald-800 ring-emerald-200 [&>span]:text-[#0ca30c]" },
};

export function Semaforo({ cor }: { cor: Cor }) {
  const e = ESTILO[cor];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${e.classe}`}>
      <span aria-hidden>{e.icone}</span>
      {e.rotulo}
    </span>
  );
}
