import Link from "next/link";
import { FormInsumo } from "@/components/FormInsumo";
import { listarCategorias } from "@/services/insumos";
import { criarInsumoAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoInsumoPage() {
  const categorias = await listarCategorias();
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/insumos" className="text-sm text-slate-500 hover:underline">
        ← Insumos
      </Link>
      <h1 className="titulo">Novo insumo</h1>
      <div className="cartao">
        <FormInsumo action={criarInsumoAction} categorias={categorias} />
      </div>
    </div>
  );
}
