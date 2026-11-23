"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ícones simples (traço), um por tela, para reconhecer o item sem ler.
const ICONES: Record<string, string> = {
  "/": "M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10",
  "/alertas": "M12 3 2 20h20L12 3Zm0 6v5m0 3v.01",
  "/insumos": "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
  "/movimentacoes": "M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4m4 4H7",
  "/pedidos": "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6",
  "/produtos": "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h3",
  "/previsao": "M3 17l6-6 4 4 8-8m0 0h-5m5 0v5",
  "/financeiro": "M12 3v18m4-14H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8",
};

// Primeiro o dia a dia (o que fazer agora); depois planejamento e análise.
const GRUPOS = [
  {
    titulo: "Dia a dia",
    links: [
      { href: "/", rotulo: "Dashboard" },
      { href: "/alertas", rotulo: "Alertas" },
      { href: "/pedidos", rotulo: "Pedidos" },
      { href: "/movimentacoes", rotulo: "Movimentações" },
      { href: "/insumos", rotulo: "Insumos" },
    ],
  },
  {
    titulo: "Planejamento",
    links: [
      { href: "/previsao", rotulo: "Previsão" },
      { href: "/produtos", rotulo: "Fichas técnicas" },
      { href: "/financeiro", rotulo: "Financeiro" },
    ],
  },
];

export function Menu() {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    <nav className="flex gap-4 overflow-x-auto md:flex-col md:gap-6" aria-label="Menu principal">
      {GRUPOS.map((g) => (
        <div key={g.titulo} className="flex gap-1 md:flex-col">
          <p className="hidden px-2 pb-1 text-xs font-medium text-slate-400 md:block">{g.titulo}</p>
          {g.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={ativo(l.href) ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap ${
                ativo(l.href) ? "bg-marca text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={ICONES[l.href]} />
              </svg>
              {l.rotulo}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
