import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { sairAction } from "@/app/login/actions";
import { Menu } from "@/components/Menu";
import { usuarioAtual } from "@/lib/auth";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EstoqueClaro",
  description: "Apoio à decisão para estoque de produtos personalizados",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const usuario = await usuarioAtual();
  return (
    <html lang="pt-BR">
      <body className={`${figtree.variable} ${geistMono.variable} antialiased`}>
        <div className="md:flex md:min-h-screen">
          {usuario && (
            <aside className="flex flex-col bg-tinta p-3 text-slate-200 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:p-4">
              <p className="mb-3 flex items-center gap-2 px-2 text-lg font-bold tracking-tight text-white md:mb-6">
                <span className="grid size-7 place-items-center rounded-lg bg-marca text-sm" aria-hidden>E</span>
                EstoqueClaro
              </p>
              <Menu />
              <form action={sairAction} className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 px-2 pt-3 md:mt-auto">
                <p className="truncate text-xs text-slate-400" title={usuario.email}>{usuario.email}</p>
                <button className="text-xs font-medium text-slate-200 hover:text-white hover:underline">Sair</button>
              </form>
            </aside>
          )}
          <main className="min-w-0 flex-1 p-4 md:p-10"><div className="mx-auto max-w-6xl">{children}</div></main>
        </div>
      </body>
    </html>
  );
}
