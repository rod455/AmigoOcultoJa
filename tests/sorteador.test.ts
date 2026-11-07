import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const s = require('../public/ferramentas/sorteador-de-nomes.js') as {
  nomes: (t: string) => string[];
  aleatorio: (n: number) => number;
  sortear: (l: string[], q: number) => string[];
  semSorteados: (l: string[], s: string[]) => string[];
  textoResultado: (s: string[]) => string;
};

describe('sorteador de nomes', () => {
  it('lê um nome por linha, sem espaços nas pontas e sem linhas vazias', () => {
    expect(s.nomes('  Ana \r\n\nBruno\t\n   \nCarla\tSilva\n')).toEqual(['Ana', 'Bruno', 'Carla Silva']);
    expect(s.nomes('')).toEqual([]);
  });

  it('sorteia sem repetir item e respeita a quantidade', () => {
    const lista = ['A', 'B', 'C', 'D', 'E'];
    for (let i = 0; i < 200; i++) {
      const r = s.sortear(lista, 3);
      expect(r).toHaveLength(3);
      expect(new Set(r).size).toBe(3);
      r.forEach((n) => expect(lista).toContain(n));
    }
    expect(s.sortear(lista, 99).sort()).toEqual(lista);
    expect(s.sortear(lista, 0)).toEqual([]);
  });

  it('nome repetido na lista conta como duas entradas', () => {
    const r = s.sortear(['Ana', 'Ana', 'Bia'], 3);
    expect(r.filter((n) => n === 'Ana')).toHaveLength(2);
  });

  it('cada nome tem a mesma chance de sair primeiro', () => {
    const lista = ['A', 'B', 'C', 'D'];
    const conta: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    const N = 8000;
    for (let i = 0; i < N; i++) conta[s.sortear(lista, 1)[0]]++;
    Object.values(conta).forEach((c) => expect(Math.abs(c / N - 0.25)).toBeLessThan(0.03));
  });

  it('aleatorio fica no intervalo', () => {
    for (let i = 0; i < 500; i++) {
      const v = s.aleatorio(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it('tira uma ocorrência por sorteado e monta o texto para copiar', () => {
    expect(s.semSorteados(['Ana', 'Bia', 'Ana', 'Caio'], ['Ana', 'Caio'])).toEqual(['Bia', 'Ana']);
    expect(s.textoResultado(['Bia', 'Ana'])).toBe('1º Bia\n2º Ana');
  });
});
