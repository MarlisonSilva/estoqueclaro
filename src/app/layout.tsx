import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { sairAction } from "@/app/login/actions";
import { Menu } from "@/components/Menu";
import { usuarioAtual } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EstoqueClaro",
  description: "Apoio à decisão para estoque de produtos personalizados",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const usuario = await usuarioAtual();
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="md:flex md:min-h-screen">
          {usuario && (
            <aside className="border-b border-slate-200 bg-white p-3 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:p-4">
              <p className="mb-3 px-3 text-lg font-bold text-emerald-700">EstoqueClaro</p>
              <Menu />
              <form action={sairAction} className="mt-3 px-3">
                <p className="mb-1 truncate text-xs text-slate-500" title={usuario.email}>{usuario.email}</p>
                <button className="text-sm text-slate-600 underline hover:text-slate-900">Sair</button>
              </form>
            </aside>
          )}
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
