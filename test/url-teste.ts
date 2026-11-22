// URL do banco de teste: o mesmo Postgres (DIRECT_URL do .env), mas no schema "teste".
// Os testes nunca tocam o schema "public", onde ficam os dados reais.
import { loadEnv } from "vite";

export function urlDeTeste(): string {
  const base = process.env.DIRECT_URL ?? loadEnv("test", process.cwd(), "").DIRECT_URL;
  if (!base) throw new Error('Defina DIRECT_URL no .env (conexão direta do Postgres) para rodar os testes.');
  const u = new URL(base);
  u.searchParams.set("schema", "teste");
  return u.toString();
}
