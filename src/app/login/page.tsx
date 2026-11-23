import { FormLogin } from "@/components/FormLogin";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-20 max-w-sm">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-marca text-lg font-bold text-white" aria-hidden>E</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-tinta">EstoqueClaro</h1>
          <p className="text-sm text-slate-500">Entre para ver o que comprar hoje.</p>
        </div>
      </div>
      <div className="cartao p-6">
        <FormLogin />
      </div>
    </div>
  );
}
