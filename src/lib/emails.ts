/** Quem pode entrar: lista de e-mails em AUTH_EMAILS_PERMITIDOS (separados por vírgula). Lista vazia = ninguém. */
export function emailPermitido(email: string | null | undefined, lista = process.env.AUTH_EMAILS_PERMITIDOS ?? ""): boolean {
  if (!email) return false;
  return lista
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}
