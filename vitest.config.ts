import { defineConfig } from "vitest/config";
import path from "node:path";
import { urlDeTeste } from "./test/url-teste";

const url = urlDeTeste();

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts"],
    // Testes de services usam o schema "teste", nunca o "public".
    env: { DATABASE_URL: url, DIRECT_URL: url },
    globalSetup: ["test/setup-banco.ts"],
    // Os testes de integração compartilham o mesmo schema.
    fileParallelism: false,
    // Banco remoto: cada consulta custa uma ida e volta de rede.
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
