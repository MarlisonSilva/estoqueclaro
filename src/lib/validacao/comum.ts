import { z } from "zod";

/**
 * Número vindo de formulário: aceita vírgula decimal ("1,5") e rejeita vazio.
 */
export const numeroBR = (mensagem = "Informe um número válido") =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.replace(",", "."))) : v),
    z.number({ required_error: "Campo obrigatório", invalid_type_error: mensagem }).finite(mensagem),
  );

/** Texto opcional: string vazia vira undefined. */
export const textoOpcional = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

/** Converte os erros do Zod em { campo: mensagem } para exibir no formulário. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "_");
    saida[campo] ??= issue.message;
  }
  return saida;
}

/** Resultado padrão das server actions de formulário. */
export type EstadoFormulario = {
  ok?: boolean;
  mensagem?: string;
  erros?: Record<string, string>;
  /** Valores enviados: o React 19 limpa o form após o envio, então devolvemos para reexibir. */
  valores?: Record<string, string>;
};

/** Campos de texto do formulário (ignora campos internos do Next e arquivos). */
export function valoresDoForm(form: FormData): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string" && !k.startsWith("$")) saida[k] = v;
  return saida;
}
