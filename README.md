# EstoqueClaro

Sistema de Apoio à Decisão (SAD) para gestão de estoque de uma loja de produtos
personalizados: canecas de sublimação, cadernos fotográficos, agendas e toalhas.

## Que problema resolve

- **Estoque cego**: insumos ficam em caixas fechadas, sem baixa automática. O gestor só
  descobre a falta na hora de produzir. Aqui, toda produção dá baixa automática e o
  sistema avisa **quando comprar** cada insumo.
- **Custo oculto**: um caderno A5 é capa + miolo + laminação + espiral + tinta, e ainda
  tem perda de produção. A ficha técnica calcula o **custo real** e o preço sugerido.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma (PostgreSQL / Supabase) · Zod · Recharts · Vitest

## Requisitos

- Node.js 20 ou superior (testado com Node 22)
- npm
- Um banco PostgreSQL (o projeto usa o Supabase)

## Como instalar e rodar

```bash
# 1. Instalar dependências (gera o Prisma Client automaticamente)
npm install

# 2. Criar o arquivo de ambiente e preencher DATABASE_URL e DIRECT_URL (ver .env.example)
cp .env.example .env

# 3. Aplicar as migrações no banco
npx prisma migrate deploy

# 4. Popular com dados de exemplo (24 meses de operação da loja)
npx prisma db seed

# 5. Subir o servidor de desenvolvimento
npm run dev
```

Acesse http://localhost:3000.

> Rodar `npx prisma db seed` de novo **apaga e recria** todos os dados. Em banco remoto o
> seed leva alguns minutos (~2.500 inserts).

- `DATABASE_URL`: Transaction pooler do Supabase (porta 6543, com `?pgbouncer=true`), usada pelo app.
- `DIRECT_URL`: Session pooler (porta 5432), usada por `migrate`, seed e testes.

> **npm 11+**: se aparecer aviso de `allow-scripts` e o Prisma reclamar de engine ausente,
> rode `npm approve-scripts prisma @prisma/client @prisma/engines esbuild` e depois `npm install`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes unitários das regras + testes de integração dos services (Vitest) |
| `npm run test:watch` | Testes em modo observação |
| `npm run lint` | ESLint |
| `npm run auditar` | Confere se o saldo de cada insumo bate com a soma das movimentações |
| `npx prisma studio` | Navegar no banco pelo navegador |
| `npx prisma db seed` | Recriar os dados de exemplo |

## Testes

```bash
npm test
```

- `src/lib/regras/*.test.ts`: funções puras de cálculo, sem banco.
- `src/services/*.test.ts`: services com transação, rodando no schema **`teste`** do mesmo
  Postgres (via `DIRECT_URL`), criado e esvaziado a cada execução por `test/setup-banco.ts`.
  O schema `public`, com os dados reais, nunca é tocado.

## Dados de exemplo

O seed simula dois anos da loja (a previsão precisa de 12 meses completos) com gerador pseudoaleatório fixo, então sempre gera os mesmos
dados. Ele usa as mesmas regras do sistema (saldo nunca negativo, custo médio ponderado,
perda da ficha técnica), portanto o histórico é consistente.

- 11 insumos (caneca branca, papel sublimático, tinta, papel fotográfico, offset, laminação, wire-o...)
- 4 produtos com ficha técnica: caneca sublimada, caderno A5, caderno universitário, agenda
- ~2.550 pedidos e ~13.000 movimentações
- O dashboard já abre com alertas: o wire-o está abaixo do mínimo (vermelho) e as caixas de
  embalagem atingiram o ponto de pedido (amarelo).
- A agenda é vendida abaixo do preço sugerido, para mostrar a margem real abaixo da meta.
- Os alertas usam os últimos 30 dias a partir de **hoje**. Se você abrir o sistema dias
  depois do seed sem registrar nada, o consumo médio cai. Rode o seed de novo para
  recomeçar a partir da data atual.

## Telas

| Tela | O que faz |
|---|---|
| **Dashboard** (`/`) | Cards de alerta, valor em estoque e pedidos em produção; lista "Comprar hoje"; gráficos de consumo e de margem |
| **Alertas** (`/alertas`) | Semáforo de todos os insumos, ponto de pedido, compra sugerida e custo estimado; filtro por situação |
| **Insumos** (`/insumos`) | Cadastro com busca e filtro por categoria; ficha do insumo com histórico e lançamento rápido |
| **Movimentações** (`/movimentacoes`) | Lançar entrada, saída, perda e inventário; histórico filtrável por insumo, tipo e período |
| **Fichas técnicas** (`/produtos`) | Custo real, perda, preço sugerido e margem real de cada produto; editor da composição |
| **Pedidos** (`/pedidos`) | Registro e fluxo de status com baixa automática, bloqueio por falta e estorno |
| **Previsão** (`/previsao`) | Previsão de consumo mensal por média móvel (k = 2, 3, 4): gráfico, erros (EQM, RQEM, EAM, EPAM) e compra sugerida para o próximo mês |
| **Financeiro** (`/financeiro`) | Ganhos × gastos dos últimos 12 meses, resultado mensal e tabela |

## Estrutura de pastas

```
prisma/
  schema.prisma          modelo do banco
  seed.ts                dados de exemplo (simulação de 12 meses)
scripts/
  auditar-estoque.ts     auditoria saldo × movimentações
test/
  setup-banco.ts         prepara o schema de teste (Postgres, schema "teste")
src/
  app/                   telas (App Router) e server actions (actions.ts de cada tela)
  components/            formulários, tabelas, semáforo e gráficos (graficos/)
  lib/
    db.ts                Prisma Client
    erros.ts             erro de regra de negócio e tradução para mensagens
    formatacao.ts        moeda, números e datas em pt-BR
    regras/              regras de negócio em funções puras + testes
      estoque.ts         saldo, sinal dos movimentos, custo médio ponderado
      custo.ts           custo da ficha técnica, perda, preço sugerido, margem real
      producao.ts        fluxo de status, necessidade de insumos, faltas, estorno
      alertas.ts         consumo médio, dias restantes, ponto de pedido, semáforo
      previsao.ts        série mensal, média móvel, erros, melhor k, compra sugerida
      financeiro.ts      resumo mensal de ganhos e gastos
    validacao/           schemas Zod dos formulários
  services/              acesso ao banco e transações + testes de integração
```

### Arquitetura

`regras` (cálculo puro, sem banco) → `services` (banco e transações) → `app` (telas e
server actions). As telas nunca calculam nada de negócio. Para adicionar depois uma API
REST, integração com Mercado Pago, área do cliente ou autenticação, basta chamar os
mesmos services: nenhuma regra precisa ser reescrita.

### Deploy na Vercel

1. Suba o repositório no GitHub e importe o projeto na Vercel (framework Next.js, detectado sozinho).
2. Em Settings > Environment Variables, defina `DATABASE_URL` e `DIRECT_URL` (mesmos valores do `.env`).
3. Aplique as migrações no banco antes do primeiro deploy: `npx prisma migrate deploy`
   (a Vercel só roda o build, não as migrações).
4. Dados sensíveis ficam só no `.env` e nas variáveis da Vercel; o `.env` está no `.gitignore`.

Pontos de atenção: valores monetários usam `Float` (considere `Decimal`). A baixa de saldo
trava a linha do insumo com `SELECT ... FOR UPDATE` (ver `src/services/movimentacoes.ts`).

## Regras de negócio

### Movimentações de estoque
- Tipos: `ENTRADA` (compra), `SAIDA_PRODUCAO`, `PERDA`, `AJUSTE` (inventário) e `ESTORNO`
  (devolve a baixa de um pedido cancelado).
- A quantidade é sempre positiva e o tipo define o sinal. A exceção é `AJUSTE`, que guarda a
  diferença com sinal (ex.: `-12` quando a contagem física achou 12 a menos).
- O saldo do insumo só muda junto com uma movimentação, na mesma transação. **O saldo
  nunca fica negativo.**
- Compras recalculam o custo unitário pelo **custo médio ponderado**:
  `(saldo × custo atual + qtd comprada × custo da compra) ÷ (saldo + qtd comprada)`.

- **Inventário**: no lançamento de `AJUSTE` o gestor informa a quantidade **contada**; o
  sistema grava a diferença para o saldo atual.
- Insumo com histórico ou usado em ficha técnica não é excluído, só **desativado** (o
  histórico e o financeiro continuam corretos). Insumo nunca usado pode ser excluído.
- Saldo e custo não são editáveis no cadastro; só mudam por movimentação.

### Ficha técnica
- Quantidade consumida = quantidade × (1 + % de perda).
- Custo real = Σ (quantidade com perda × custo médio atual do insumo) + custo operacional.
  A tela mostra quanto do custo é só perda de produção.
- Preço sugerido = custo ÷ (1 − margem-alvo). Ex.: custo R$ 10 com margem de 40% → R$ 16,67.
- Margem real = (preço praticado − custo) ÷ preço praticado. Se o preço praticado ficar
  vazio, vale o sugerido. Margem real abaixo da meta aparece em vermelho.
- Margem-alvo vai de 0% a 95%. Produto com pedidos não é excluído, só desativado.

### Pedidos
- Fluxo: `Aguardando arte → Em produção → Concluído`. Dá para cancelar nas duas primeiras
  etapas. Concluído e cancelado são finais.
- **Iniciar produção** dá baixa de todos os insumos da ficha, já com a perda
  (qtd por unidade × qtd do pedido × (1 + perda)), gerando uma `SAIDA_PRODUCAO` por insumo.
- Se faltar qualquer insumo, a produção é **bloqueada** e o sistema informa o que falta e
  quanto. Nada é baixado: a transação inteira é desfeita.
- Pedidos aguardando arte já mostram na lista se o saldo atual cobre a produção.
- **Cancelar** um pedido em produção gera `ESTORNO` de tudo que foi baixado, pelo custo médio
  atual. O estorno nunca devolve em dobro.
- Sem preço informado, o pedido usa o preço praticado do produto (ou o sugerido).
- Pedidos concluídos entram no financeiro pela data de conclusão.

### Alertas e ponto de pedido
- Consumo médio diário = (saídas de produção + perdas − estornos dos últimos 30 dias) ÷ 30.
  Compras e ajustes de inventário não contam como consumo.
- Dias restantes = saldo ÷ consumo médio (sem consumo: estoque não acaba).
- Ponto de pedido = consumo médio × prazo de entrega + estoque mínimo.
- Semáforo:
  - 🔴 **Crítico**: saldo abaixo do mínimo **ou** o estoque acaba antes de a compra chegar
    (dias restantes < prazo de entrega).
  - 🟡 **Comprar**: saldo atingiu o ponto de pedido.
  - 🟢 **Ok**.
- Compra sugerida = consumo × (prazo + 30 dias) + mínimo − saldo, arredondada para cima.
  Cobre a espera da entrega, mais 30 dias de uso, e repõe o estoque de segurança.
- "Comprar hoje" ordena por urgência: cor do semáforo, depois menor folga
  (dias restantes − prazo), depois saldo relativo ao mínimo.

### Previsão de consumo (média móvel simples, período mensal)
- Série: consumo mensal de cada insumo nos últimos 12 meses **completos** (o mês atual fica de
  fora). Mesma definição de consumo dos alertas: saídas de produção + perdas − estornos;
  entradas e ajustes não contam. Mês sem consumo vale 0.
- Média móvel: `F(t+1) = [Y(t) + Y(t−1) + … + Y(t−k+1)] ÷ k`, testada com k = 2, 3 e 4.
- Erros, sempre do 5º mês em diante (mesmo intervalo para todos os k, comparação justa):
  EQM = média de e², RQEM = √EQM, EAM = média de |e|, EPAM = média de |e| ÷ Y (ignora meses
  com Y = 0). Com menos de 5 meses não há como medir erro nem decidir.
- Melhor k = o de menor EQM (empate fica com o menor k).
- Previsão dos próximos 3 meses é recursiva: cada previsão entra na série para gerar a seguinte.
- Compra para o mês seguinte à série = `⌈previsão + z × RQEM + estoque mínimo − saldo⌉`, nunca
  negativa. `z` = 1,645 (≈ 95% de nível de serviço); é parâmetro de `previsoesDeConsumo`.
- A previsão é de quantidade por mês. Não considera prazo de entrega nem sazonalidade: com
  poucos anos de dados, a média móvel só segue a tendência recente.

### Dashboard
- Cards: insumos em alerta, valor total em estoque (saldo × custo médio), pedidos em produção.
- Lista "Comprar hoje" com quantidade e custo estimado da compra.
- Consumo por insumo nos últimos 30 dias em R$ (unidades diferentes só se comparam em dinheiro).
- Ranking de produtos por margem real, ao lado da margem-alvo.

### Financeiro
- Ganhos = valor dos pedidos concluídos, no mês da conclusão.
- Gastos = compras de insumos (movimentações de entrada).
- Resultado mensal = ganhos − gastos. É uma visão de caixa simples: não inclui custos fixos.

## Andamento

- [x] Fase 1 — setup, schema, seed
- [x] Fase 2 — insumos e movimentações
- [x] Fase 3 — fichas técnicas e custo/preço
- [x] Fase 4 — pedidos com baixa automática e estorno
- [x] Fase 5 — alertas, ponto de pedido e dashboard
- [x] Fase 6 — financeiro, testes finais e README
- [x] Fase 7 — previsão de consumo mensal por média móvel

## Fora do escopo desta versão

Simulador 3D, integração com Mercado Pago, área do cliente e autenticação (uso por um único gestor).
