import { FormLogin } from "@/components/FormLogin";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4">
      <h1 className="titulo text-emerald-700">EstoqueClaro</h1>
      <p className="text-sm text-slate-500">Entre para acessar o sistema.</p>
      <div className="cartao">
        <FormLogin />
      </div>
    </div>
  );
}
