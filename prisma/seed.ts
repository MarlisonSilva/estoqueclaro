// Seed do EstoqueClaro.
// Simula 24 meses de operação da loja em memória, usando as mesmas regras puras
// do sistema (saldo nunca negativo, custo médio ponderado, perda da ficha técnica).
// Assim o histórico gravado é consistente: saldo do insumo = soma das movimentações.
// Os últimos 30 dias alimentam os alertas; os 12 meses mais recentes alimentam o financeiro;
// os meses completos alimentam a previsão de consumo.

import { PrismaClient } from "@prisma/client";
import {
  aplicarMovimento,
  arredondarCusto,
  arredondarDinheiro,
  arredondarQtd,
  custoMedioPonderado,
  type TipoMovimentacao,
} from "../src/lib/regras/estoque";
import { quantidadeComPerda } from "../src/lib/regras/custo";
import { analisarInsumo } from "../src/lib/regras/alertas";

const prisma = new PrismaClient();

// Gerador pseudoaleatório determinístico: o seed gera sempre os mesmos dados.
function mulberry32(semente: number) {
  return () => {
    semente |= 0;
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const aleatorio = mulberry32(2024);
const entre = (min: number, max: number) => min + Math.floor(aleatorio() * (max - min + 1));

// 24 meses: a previsão mensal precisa de 12 meses completos + folga, e o 1º mês simulado nasce incompleto.
const DIAS_SIMULADOS = 730;
const hoje = new Date();
hoje.setHours(12, 0, 0, 0);
const diaRelativo = (offset: number, hora = 10) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + offset);
  d.setHours(hora, entre(0, 59), 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------------

type InsumoSeed = {
  chave: string;
  nome: string;
  categoria: string;
  unidade: "un" | "folha" | "ml" | "m" | "kg";
  custoBase: number;
  estoqueMinimo: number;
  prazoEntregaDias: number;
  gatilhoCompra: number; // compra quando o saldo cai abaixo disso
  lote: number; // quantidade comprada por vez
  // Para o dashboard abrir com alertas: o gestor não repôs nos últimos N dias...
  semCompraUltimosDias?: number;
  // ...e a contagem física de hoje achou só esta quantidade ("estoque cego").
  inventarioFinal?: number;
};

const INSUMOS: InsumoSeed[] = [
  { chave: "caneca", nome: "Caneca cilíndrica branca 325 ml", categoria: "Cerâmica", unidade: "un", custoBase: 6.5, estoqueMinimo: 24, prazoEntregaDias: 7, gatilhoCompra: 60, lote: 144 },
  { chave: "caixa", nome: "Caixa de embalagem para caneca", categoria: "Embalagem", unidade: "un", custoBase: 1.2, estoqueMinimo: 30, prazoEntregaDias: 15, gatilhoCompra: 80, lote: 200, semCompraUltimosDias: 18, inventarioFinal: 75 },
  { chave: "papelSub", nome: "Papel sublimático A4", categoria: "Papel", unidade: "folha", custoBase: 0.35, estoqueMinimo: 100, prazoEntregaDias: 5, gatilhoCompra: 150, lote: 500 },
  { chave: "tintaSub", nome: "Tinta sublimática (refil)", categoria: "Tinta", unidade: "ml", custoBase: 0.45, estoqueMinimo: 200, prazoEntregaDias: 10, gatilhoCompra: 350, lote: 800 },
  { chave: "papelFoto", nome: "Papel fotográfico A4 180 g", categoria: "Papel", unidade: "folha", custoBase: 0.8, estoqueMinimo: 60, prazoEntregaDias: 5, gatilhoCompra: 90, lote: 200 },
  { chave: "offset", nome: "Papel offset A4 75 g (miolo)", categoria: "Papel", unidade: "folha", custoBase: 0.1, estoqueMinimo: 1500, prazoEntregaDias: 7, gatilhoCompra: 3000, lote: 5000 },
  { chave: "laminacao", nome: "Filme de laminação BOPP", categoria: "Acabamento", unidade: "m", custoBase: 1.2, estoqueMinimo: 15, prazoEntregaDias: 7, gatilhoCompra: 25, lote: 100 },
  { chave: "wireo", nome: "Espiral wire-o 1/4\"", categoria: "Encadernação", unidade: "un", custoBase: 0.9, estoqueMinimo: 40, prazoEntregaDias: 12, gatilhoCompra: 70, lote: 200, semCompraUltimosDias: 20, inventarioFinal: 22 },
  { chave: "papelao", nome: "Papelão Paraná 1,5 mm (capa A4)", categoria: "Papel", unidade: "folha", custoBase: 1.1, estoqueMinimo: 30, prazoEntregaDias: 10, gatilhoCompra: 55, lote: 150 },
  { chave: "tintaImp", nome: "Tinta corante para impressora (refil)", categoria: "Tinta", unidade: "ml", custoBase: 0.25, estoqueMinimo: 250, prazoEntregaDias: 7, gatilhoCompra: 400, lote: 1000 },
  { chave: "elastico", nome: "Elástico de fechamento", categoria: "Acabamento", unidade: "un", custoBase: 0.4, estoqueMinimo: 20, prazoEntregaDias: 12, gatilhoCompra: 35, lote: 100 },
];

type ProdutoSeed = {
  chave: string;
  nome: string;
  custoOperacional: number;
  margemAlvo: number;
  precoVenda: number;
  demandaDiaria: number; // média de pedidos por dia
  qtdPorPedido: [number, number];
  itens: { insumo: string; quantidade: number; perda: number }[];
};

const PRODUTOS: ProdutoSeed[] = [
  {
    chave: "caneca",
    nome: "Caneca sublimada personalizada",
    custoOperacional: 2.5,
    margemAlvo: 0.5,
    precoVenda: 35,
    demandaDiaria: 1.6,
    qtdPorPedido: [1, 4],
    itens: [
      { insumo: "caneca", quantidade: 1, perda: 0 },
      { insumo: "caixa", quantidade: 1, perda: 0 },
      { insumo: "papelSub", quantidade: 1, perda: 0.05 },
      { insumo: "tintaSub", quantidade: 2, perda: 0.1 },
    ],
  },
  {
    chave: "cadernoA5",
    nome: "Caderno A5 personalizado",
    custoOperacional: 6,
    margemAlvo: 0.45,
    precoVenda: 45,
    demandaDiaria: 0.7,
    qtdPorPedido: [1, 3],
    itens: [
      { insumo: "papelao", quantidade: 1, perda: 0.05 },
      { insumo: "papelFoto", quantidade: 1, perda: 0.08 },
      { insumo: "laminacao", quantidade: 0.35, perda: 0.05 },
      { insumo: "offset", quantidade: 40, perda: 0.03 },
      { insumo: "wireo", quantidade: 1, perda: 0 },
      { insumo: "tintaImp", quantidade: 4, perda: 0.1 },
    ],
  },
  {
    chave: "cadernoUni",
    nome: "Caderno universitário personalizado",
    custoOperacional: 9,
    margemAlvo: 0.45,
    precoVenda: 69,
    demandaDiaria: 0.4,
    qtdPorPedido: [1, 2],
    itens: [
      { insumo: "papelao", quantidade: 2, perda: 0.05 },
      { insumo: "papelFoto", quantidade: 2, perda: 0.08 },
      { insumo: "laminacao", quantidade: 0.6, perda: 0.05 },
      { insumo: "offset", quantidade: 96, perda: 0.03 },
      { insumo: "wireo", quantidade: 1, perda: 0 },
      { insumo: "tintaImp", quantidade: 8, perda: 0.1 },
    ],
  },
  {
    chave: "agenda",
    nome: "Agenda personalizada",
    custoOperacional: 8,
    margemAlvo: 0.45,
    // Preço praticado abaixo do sugerido: o sistema deve mostrar a margem real menor.
    precoVenda: 42,
    demandaDiaria: 0.35,
    qtdPorPedido: [1, 2],
    itens: [
      { insumo: "papelao", quantidade: 1, perda: 0.05 },
      { insumo: "papelFoto", quantidade: 1, perda: 0.08 },
      { insumo: "laminacao", quantidade: 0.35, perda: 0.05 },
      { insumo: "offset", quantidade: 90, perda: 0.03 },
      { insumo: "wireo", quantidade: 1, perda: 0 },
      { insumo: "elastico", quantidade: 1, perda: 0 },
      { insumo: "tintaImp", quantidade: 10, perda: 0.1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Simulação em memória
// ---------------------------------------------------------------------------

type Estado = { saldo: number; custo: number };
type MovSim = {
  insumo: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  custoUnitario: number;
  motivo: string;
  data: Date;
  pedido?: number; // índice do pedido simulado
};
type PedidoSim = {
  produto: string;
  cliente: string;
  quantidade: number;
  precoUnitario: number;
  status: "AGUARDANDO_ARTE" | "EM_PRODUCAO" | "CONCLUIDO" | "CANCELADO";
  criadoEm: Date;
  concluidoEm?: Date;
};

const CLIENTES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Escola Pequeno Saber", "Diego Rocha",
  "Fernanda Alves", "Clínica Sorriso", "Gabriel Costa", "Helena Martins", "Igreja Boa Nova",
  "Juliana Pereira", "Lucas Ribeiro", "Mariana Dias", "Padaria Pão Quente", "Rafael Nunes",
];

const estado = new Map<string, Estado>();
const movs: MovSim[] = [];
const pedidos: PedidoSim[] = [];
const insumoPorChave = new Map(INSUMOS.map((i) => [i.chave, i]));

// Inflação leve: insumos ficam ~8% mais caros por ano, com ruído de ±4%.
const custoDaCompra = (i: InsumoSeed, dia: number) =>
  arredondarCusto(i.custoBase * (1 + 0.08 * ((dia + DIAS_SIMULADOS) / 365)) * (0.96 + aleatorio() * 0.08));

function registrar(chave: string, tipo: TipoMovimentacao, quantidade: number, data: Date, motivo: string, custoEntrada?: number, pedido?: number) {
  const e = estado.get(chave)!;
  const qtd = arredondarQtd(quantidade);
  if (tipo === "ENTRADA") e.custo = custoMedioPonderado(e.saldo, e.custo, qtd, custoEntrada!);
  e.saldo = aplicarMovimento(e.saldo, tipo, qtd); // lança se ficar negativo
  movs.push({ insumo: chave, tipo, quantidade: qtd, custoUnitario: tipo === "ENTRADA" ? custoEntrada! : e.custo, motivo, data, pedido });
}

function comprar(i: InsumoSeed, dia: number, motivo = "Compra de reposição") {
  registrar(i.chave, "ENTRADA", i.lote, diaRelativo(dia, 9), motivo, custoDaCompra(i, dia));
}

// Estoque inicial: uma compra de abertura para cada insumo.
for (const i of INSUMOS) {
  estado.set(i.chave, { saldo: 0, custo: 0 });
  registrar(i.chave, "ENTRADA", i.lote, diaRelativo(-DIAS_SIMULADOS - 1, 9), "Estoque inicial", custoDaCompra(i, -DIAS_SIMULADOS));
}

/** Necessidade total de insumos para um pedido, já com perda. */
function necessidade(p: ProdutoSeed, qtd: number) {
  return p.itens.map((it) => ({ insumo: it.insumo, quantidade: quantidadeComPerda(it.quantidade * qtd, it.perda) }));
}

const podeComprar = (i: InsumoSeed, dia: number) => !i.semCompraUltimosDias || dia < -i.semCompraUltimosDias;

function produzir(idx: number, dia: number): boolean {
  const ped = pedidos[idx];
  const prod = PRODUTOS.find((p) => p.chave === ped.produto)!;
  const nec = necessidade(prod, ped.quantidade);
  // Compra emergencial se faltar algo (quando o gestor ainda está repondo aquele insumo).
  for (const n of nec) {
    const i = insumoPorChave.get(n.insumo)!;
    while (estado.get(n.insumo)!.saldo < n.quantidade && podeComprar(i, dia)) comprar(i, dia, "Compra emergencial");
  }
  if (nec.some((n) => estado.get(n.insumo)!.saldo < n.quantidade)) return false;
  for (const n of nec) registrar(n.insumo, "SAIDA_PRODUCAO", n.quantidade, diaRelativo(dia, 14), `Produção do pedido`, undefined, idx);
  return true;
}

// Dezembro/janeiro vendem mais agendas e canecas (fim de ano / volta às aulas).
function sazonalidade(data: Date, produto: string) {
  const m = data.getMonth();
  if (produto === "agenda" && (m === 11 || m === 0)) return 3;
  if (produto === "caneca" && (m === 11 || m === 4)) return 1.6;
  if (produto.startsWith("caderno") && (m === 0 || m === 1)) return 1.8;
  return 1;
}

for (let dia = -DIAS_SIMULADOS; dia <= 0; dia++) {
  const data = diaRelativo(dia);

  // 1) Novos pedidos do dia.
  for (const p of PRODUTOS) {
    const media = p.demandaDiaria * sazonalidade(data, p.chave);
    let n = Math.floor(media) + (aleatorio() < media % 1 ? 1 : 0);
    while (n-- > 0) {
      const qtd = aleatorio() < 0.05 ? entre(10, 20) : entre(...p.qtdPorPedido); // às vezes pedido corporativo
      pedidos.push({
        produto: p.chave,
        cliente: CLIENTES[entre(0, CLIENTES.length - 1)],
        quantidade: qtd,
        precoUnitario: p.precoVenda,
        status: "AGUARDANDO_ARTE",
        criadoEm: diaRelativo(dia, entre(8, 18)),
      });
    }
  }

  // 2) Pedidos com arte aprovada (1 dia depois) entram em produção; ~3% são cancelados antes.
  pedidos.forEach((ped, idx) => {
    if (ped.status !== "AGUARDANDO_ARTE") return;
    const idade = Math.round((data.getTime() - ped.criadoEm.getTime()) / 86400000);
    if (idade < 1 || (dia > -3 && aleatorio() < 0.5)) return; // os mais recentes ficam aguardando arte
    if (aleatorio() < 0.03) {
      ped.status = "CANCELADO";
      return;
    }
    if (produzir(idx, dia)) ped.status = "EM_PRODUCAO";
  });

  // 3) Pedidos em produção há 2 dias são concluídos (entram no financeiro).
  pedidos.forEach((ped, idx) => {
    if (ped.status !== "EM_PRODUCAO") return;
    const saida = movs.find((m) => m.pedido === idx);
    if (!saida) return;
    const dias = Math.round((data.getTime() - saida.data.getTime()) / 86400000);
    if (dias >= 2) {
      ped.status = "CONCLUIDO";
      ped.concluidoEm = diaRelativo(dia, 17);
    }
  });

  // 4) Perdas esporádicas: impressão errada, caneca quebrada.
  if (aleatorio() < 0.12) {
    const opcoes: [string, number, string][] = [
      ["caneca", entre(1, 2), "Caneca quebrou na prensa"],
      ["papelSub", entre(2, 6), "Impressão sublimática com falha"],
      ["papelFoto", entre(1, 3), "Capa impressa com cor errada"],
      ["laminacao", 0.5, "Filme enrugou na laminadora"],
    ];
    const [chave, qtd, motivo] = opcoes[entre(0, opcoes.length - 1)];
    if (estado.get(chave)!.saldo >= qtd) registrar(chave, "PERDA", qtd, diaRelativo(dia, 16), motivo);
  }

  // 5) Inventário mensal: pequeno ajuste de contagem no papel offset.
  if (data.getDate() === 1 && estado.get("offset")!.saldo > 50) {
    registrar("offset", "AJUSTE", -entre(5, 30), diaRelativo(dia, 18), "Inventário mensal: diferença de contagem");
  }

  // 6) Reposição de fim do dia.
  for (const i of INSUMOS) {
    if (estado.get(i.chave)!.saldo < i.gatilhoCompra && podeComprar(i, dia)) comprar(i, dia);
  }
}

// Inventário de hoje: caixas fechadas tinham menos do que o sistema dizia.
for (const i of INSUMOS) {
  const saldo = estado.get(i.chave)!.saldo;
  if (i.inventarioFinal !== undefined && saldo > i.inventarioFinal) {
    registrar(i.chave, "AJUSTE", i.inventarioFinal - saldo, diaRelativo(0, 8), "Inventário: contagem física abaixo do sistema");
  }
}

// Um pedido em produção cancelado nos últimos dias: gera estorno das saídas.
const idxCancelar = pedidos.findLastIndex((p) => p.status === "EM_PRODUCAO");
if (idxCancelar >= 0) {
  for (const s of movs.filter((m) => m.pedido === idxCancelar && m.tipo === "SAIDA_PRODUCAO")) {
    registrar(s.insumo, "ESTORNO", s.quantidade, diaRelativo(0, 11), "Estorno: pedido cancelado pelo cliente", undefined, idxCancelar);
  }
  pedidos[idxCancelar].status = "CANCELADO";
}

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------

async function main() {
  await prisma.$transaction([
    prisma.movimentacao.deleteMany(),
    prisma.pedido.deleteMany(),
    prisma.fichaItem.deleteMany(),
    prisma.produto.deleteMany(),
    prisma.insumo.deleteMany(),
  ]);

  const idInsumo = new Map<string, number>();
  for (const i of INSUMOS) {
    const e = estado.get(i.chave)!;
    const criado = await prisma.insumo.create({
      data: {
        nome: i.nome,
        categoria: i.categoria,
        unidade: i.unidade,
        quantidadeEstoque: e.saldo,
        estoqueMinimo: i.estoqueMinimo,
        custoUnitario: e.custo,
        prazoEntregaDias: i.prazoEntregaDias,
        criadoEm: diaRelativo(-DIAS_SIMULADOS - 1, 8),
      },
    });
    idInsumo.set(i.chave, criado.id);
  }

  const idProduto = new Map<string, number>();
  for (const p of PRODUTOS) {
    const criado = await prisma.produto.create({
      data: {
        nome: p.nome,
        custoOperacional: p.custoOperacional,
        margemAlvo: p.margemAlvo,
        precoVenda: p.precoVenda,
        itens: {
          create: p.itens.map((it) => ({
            insumoId: idInsumo.get(it.insumo)!,
            quantidade: it.quantidade,
            perdaPercentual: it.perda,
          })),
        },
      },
    });
    idProduto.set(p.chave, criado.id);
  }

  // Pedidos um a um para obter os ids; ~2.500 registros; leva alguns minutos num banco remoto.
  const idPedido: number[] = [];
  for (const ped of pedidos) {
    const criado = await prisma.pedido.create({
      data: {
        cliente: ped.cliente,
        produtoId: idProduto.get(ped.produto)!,
        quantidade: ped.quantidade,
        precoUnitario: ped.precoUnitario,
        status: ped.status,
        criadoEm: ped.criadoEm,
        concluidoEm: ped.concluidoEm,
      },
    });
    idPedido.push(criado.id);
  }

  await prisma.movimentacao.createMany({
    data: movs.map((m) => ({
      insumoId: idInsumo.get(m.insumo)!,
      tipo: m.tipo,
      quantidade: m.quantidade,
      custoUnitario: m.custoUnitario,
      custoTotal: arredondarDinheiro(Math.abs(m.quantidade) * m.custoUnitario),
      motivo: m.pedido !== undefined ? `${m.motivo} #${idPedido[m.pedido]}` : m.motivo,
      data: m.data,
      pedidoId: m.pedido !== undefined ? idPedido[m.pedido] : null,
    })),
  });

  const porStatus = pedidos.reduce<Record<string, number>>((acc, p) => ((acc[p.status] = (acc[p.status] ?? 0) + 1), acc), {});
  console.log(`Seed concluído: ${INSUMOS.length} insumos, ${PRODUTOS.length} produtos, ${pedidos.length} pedidos, ${movs.length} movimentações.`);
  console.log("Pedidos por status:", porStatus);
  // Situação final pelos mesmos cálculos da tela de alertas.
  console.table(
    INSUMOS.map((i) => {
      const e = estado.get(i.chave)!;
      const alerta = analisarInsumo(
        { id: 0, nome: i.nome, unidade: i.unidade, quantidadeEstoque: e.saldo, estoqueMinimo: i.estoqueMinimo, prazoEntregaDias: i.prazoEntregaDias, custoUnitario: e.custo },
        movs.filter((m) => m.insumo === i.chave),
        new Date(),
      );
      return {
        insumo: i.chave,
        saldo: e.saldo,
        minimo: i.estoqueMinimo,
        consumoDia: +alerta.consumoDiario.toFixed(2),
        pontoPedido: +alerta.pontoPedido.toFixed(1),
        prazo: i.prazoEntregaDias,
        semaforo: alerta.semaforo,
      };
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
