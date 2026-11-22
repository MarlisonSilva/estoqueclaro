import { describe, expect, it } from "vitest";
import {
  agruparPorMes,
  ajustado,
  analisarPrevisao,
  decisaoCompra,
  erros,
  mediaMovel,
  melhorK,
  preverProximos,
} from "./previsao";

// Série de 8 meses feita para conferir à mão. Avaliação: meses 5 a 8 (Y = 40, 50, 30, 60).
const Y = [10, 20, 30, 20, 40, 50, 30, 60];
const HOJE = new Date(2026, 10, 22); // 22/nov/2026 → mês seguinte à série: nov/2026

describe("agruparPorMes", () => {
  it("soma saída + perda − estorno, ignora entrada/ajuste/mês atual e preenche 0", () => {
    const m = (tipo: string, quantidade: number, mes: number, dia = 10) => ({ tipo: tipo as never, quantidade, data: new Date(2026, mes, dia) });
    const serie = agruparPorMes(
      [
        m("SAIDA_PRODUCAO", 10, 7), m("PERDA", 5, 7), m("ESTORNO", 3, 7), // ago = 12
        m("ENTRADA", 99, 8), m("AJUSTE", -50, 8), // set = 0
        m("SAIDA_PRODUCAO", 7, 9, 31), // out = 7
        m("SAIDA_PRODUCAO", 400, 10, 1), // nov (mês atual) fica de fora
      ],
      HOJE,
      3,
    );
    expect(serie.map((p) => p.rotulo)).toEqual(["ago/2026", "set/2026", "out/2026"]);
    expect(serie.map((p) => p.valor)).toEqual([12, 0, 7]);
  });

  it("estorno maior que o consumo do mês não gera valor negativo", () => {
    const serie = agruparPorMes([{ tipo: "ESTORNO", quantidade: 5, data: new Date(2026, 9, 3) }], HOJE, 1);
    expect(serie[0].valor).toBe(0);
  });
});

describe("mediaMovel", () => {
  it("k = 2 e k = 3 sobre os últimos meses", () => {
    expect(mediaMovel(Y, 2)).toBe(45); // (60 + 30) / 2
    expect(mediaMovel(Y, 3)).toBeCloseTo(140 / 3, 10); // (60 + 30 + 50) / 3
  });

  it("série menor que k não tem previsão", () => {
    expect(mediaMovel([5], 2)).toBeNull();
    expect(mediaMovel([], 3)).toBeNull();
  });

  it("valor ajustado começa no mês k + 1", () => {
    expect(ajustado(Y, 2)).toEqual([null, null, 15, 25, 25, 30, 45, 40]);
  });
});

describe("erros", () => {
  it("k = 2: EQM, RQEM, EAM e EPAM", () => {
    // erros: +15, +20, −15, +20
    const e = erros(Y, 2)!;
    expect(e.n).toBe(4);
    expect(e.eqm).toBe(312.5);
    expect(e.rqem).toBeCloseTo(Math.sqrt(312.5), 10);
    expect(e.eam).toBe(17.5);
    expect(e.epam).toBeCloseTo((15 / 40 + 20 / 50 + 15 / 30 + 20 / 60) / 4, 10); // ≈ 40,2%
  });

  it("k = 3: EQM = 2525/9 e EAM ≈ 15,83", () => {
    // erros: +50/3, +20, −20/3, +20
    const e = erros(Y, 3)!;
    expect(e.eqm).toBeCloseTo(2525 / 9, 10);
    expect(e.eam).toBeCloseTo(190 / 12, 10);
  });

  it("k = 4: EQM = 389,0625", () => {
    // erros: +20, +22,5, −5, +25
    expect(erros(Y, 4)!.eqm).toBe(389.0625);
  });

  it("EPAM ignora meses com Y = 0, mas EQM e EAM não", () => {
    // meses 5 e 6: Y = 0 (F = 4, erro −4) e Y = 4 (F = 2, erro +2)
    const e = erros([4, 4, 4, 4, 0, 4], 2)!;
    expect(e.n).toBe(2);
    expect(e.eqm).toBe(10);
    expect(e.eam).toBe(3);
    expect(e.epam).toBe(0.5); // só o mês com Y = 4: 2 / 4
  });

  it("EPAM é null se todos os meses avaliados são 0", () => {
    expect(erros([0, 0, 0, 0, 0, 0], 2)!.epam).toBeNull();
  });

  it("menos de 5 meses não tem como medir erro", () => {
    expect(erros([1, 2, 3, 4], 2)).toBeNull();
  });
});

describe("melhorK", () => {
  it("escolhe o k de menor EQM", () => {
    expect(melhorK([2, 3, 4].map((k) => erros(Y, k)))).toBe(3); // 280,6 < 312,5 < 389,1
  });

  it("sem dados, nenhum k", () => {
    expect(melhorK([null, null, null])).toBeNull();
  });
});

describe("preverProximos", () => {
  it("é recursiva: cada previsão entra na série", () => {
    // k = 2: (60+30)/2 = 45 → (45+60)/2 = 52,5 → (52,5+45)/2 = 48,75
    expect(preverProximos(Y, 2, 3)).toEqual([45, 52.5, 48.75]);
  });

  it("série menor que k não prevê nada", () => {
    expect(preverProximos([5], 2)).toEqual([]);
  });
});

describe("decisaoCompra", () => {
  const rqem3 = Math.sqrt(2525 / 9);

  it("compra = ⌈previsão + z × RQEM + mínimo − saldo⌉", () => {
    // 46,667 + 1,645 × 16,750 + 20 − 30 = 64,22 → 65
    const d = decisaoCompra(Y, 3, rqem3, 30, 20, HOJE)!;
    expect(d.previsao).toBeCloseTo(46.6667, 3);
    expect(d.margem).toBeCloseTo(27.553, 2);
    expect(d.compra).toBe(65);
  });

  it("saldo maior que a necessidade: compra = 0", () => {
    expect(decisaoCompra(Y, 3, rqem3, 500, 20, HOJE)!.compra).toBe(0);
  });

  it("z configurável: z = 0 desliga a margem", () => {
    // 45 + 0 + 10 − 20 = 35
    expect(decisaoCompra(Y, 2, 17.7, 20, 10, HOJE, 0)!.compra).toBe(35);
  });

  it("mostra a equação com números", () => {
    expect(decisaoCompra(Y, 2, 1, 0, 0, HOJE)!.equacao).toBe("F(nov/2026) = (60 + 30) / 2 = 45");
    expect(decisaoCompra([120, 135], 2, 1, 0, 0, HOJE)!.equacao).toBe("F(nov/2026) = (135 + 120) / 2 = 127,5");
  });

  it("série menor que k não gera decisão", () => {
    expect(decisaoCompra([5], 2, 1, 0, 0, HOJE)).toBeNull();
  });
});

describe("analisarPrevisao", () => {
  const serie = Y.map((valor, i) => ({ mes: `m${i}`, rotulo: `m${i}`, valor }));

  it("usa o melhor k, prevê 3 meses e monta o gráfico", () => {
    const a = analisarPrevisao(serie, 30, 20, HOJE);
    expect(a.melhorK).toBe(3);
    expect(a.previsoes.map((p) => p.rotulo)).toEqual(["nov/2026", "dez/2026", "jan/2027"]);
    expect(a.decisao!.compra).toBe(65);
    expect(a.grafico).toHaveLength(11);
    expect(a.grafico[7].previsao).toBe(60); // tracejado ligado ao último mês real
  });

  it("histórico curto: sem k, sem previsão, sem decisão", () => {
    const a = analisarPrevisao(serie.slice(0, 4), 30, 20, HOJE);
    expect(a.melhorK).toBeNull();
    expect(a.previsoes).toEqual([]);
    expect(a.decisao).toBeNull();
  });
});
