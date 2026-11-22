"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", rotulo: "Dashboard" },
  { href: "/alertas", rotulo: "Alertas" },
  { href: "/insumos", rotulo: "Insumos" },
  { href: "/movimentacoes", rotulo: "Movimentações" },
  { href: "/produtos", rotulo: "Fichas técnicas" },
  { href: "/pedidos", rotulo: "Pedidos" },
  { href: "/previsao", rotulo: "Previsão" },
  { href: "/financeiro", rotulo: "Financeiro" },
];

export function Menu() {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Menu principal">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={ativo(l.href) ? "page" : undefined}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
            ativo(l.href) ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {l.rotulo}
        </Link>
      ))}
    </nav>
  );
}
