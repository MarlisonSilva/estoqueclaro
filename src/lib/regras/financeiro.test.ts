import { describe, expect, it } from "vitest";
import { inicioDaJanela, resumoMensal, totais } from "./financeiro";

const hoje = new Date(2026, 9, 31, 15); // 31/out/2026
const d = (ano: number, mes: number, dia: number) => new Date(ano, mes - 1, dia, 10);

describe("resumoMensal", () => {
  it("gera 12 meses, do mais antigo ao atual", () => {
    const r = resumoMensal([], [], hoje);
    expect(r).toHaveLength(12);
    expect(r[0]).toMatchObject({ mes: "2025-11", rotulo: "nov/25" });
    expect(r[11]).toMatchObject({ mes: "2026-10", rotulo: "out/26" });
  });

  it("soma ganhos e gastos no mês certo e calcula o resultado", () => {
    const r = resumoMensal(
      [
        { data: d(2026, 10, 1), valor: 100 },
        { data: d(2026, 10, 31), valor: 50.5 },
        { data: d(2026, 9, 30), valor: 70 },
      ],
      [
        { data: d(2026, 10, 15), valor: 30.25 },
        { data: d(2026, 9, 1), valor: 90 },
      ],
      hoje,
    );
    expect(r[11]).toMatchObject({ ganhos: 150.5, gastos: 30.25, resultado: 120.25 });
    expect(r[10]).toMatchObject({ ganhos: 70, gastos: 90, resultado: -20 });
  });

  it("ignora lançamentos fora da janela", () => {
    const r = resumoMensal([{ data: d(2025, 10, 31), valor: 999 }], [{ data: d(2026, 11, 1), valor: 999 }], hoje);
    expect(totais(r)).toEqual({ ganhos: 0, gastos: 0, resultado: 0 });
  });

  it("atravessa a virada do ano", () => {
    const r = resumoMensal([], [], new Date(2026, 0, 10), 3);
    expect(r.map((m) => m.mes)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("inicioDaJanela", () => {
  it("é o dia 1 do mês mais antigo", () => {
    expect(inicioDaJanela(hoje)).toEqual(new Date(2025, 10, 1));
  });
});
