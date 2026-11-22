import { Prisma } from "@prisma/client";
import type { EstadoFormulario } from "./validacao/comum";

/** Erro de regra de negócio: a mensagem é segura para mostrar ao gestor. */
export class RegraNegocioError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "RegraNegocioError";
  }
}

/** Converte erros conhecidos em mensagem de formulário; erros inesperados sobem. */
export function tratarErro(e: unknown): EstadoFormulario {
  if (e instanceof RegraNegocioError) return { mensagem: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { mensagem: "Já existe um cadastro com esse nome." };
  }
  throw e;
}
