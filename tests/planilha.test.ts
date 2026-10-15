/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { groupName, OTHER_AREAS, parseDelimited, pickSheet, planGroups, readPeople } from '../src/lib/planilha';
import { draw, validatePairs } from '../supabase/functions/_shared/draw';

describe('parseDelimited', () => {
  it('lê o CSV do Excel em português (ponto e vírgula, BOM, CRLF)', () => {
    expect(parseDelimited('﻿Nome;Área\r\nAna Souza;Financeiro\r\n')).toEqual([
      ['Nome', 'Área'],
      ['Ana Souza', 'Financeiro'],
    ]);
  });
  it('lê o que foi colado do Excel (tab) e respeita aspas', () => {
    expect(parseDelimited('Nome\tÁrea\n"Souza, Ana"\tRH')).toEqual([
      ['Nome', 'Área'],
      ['Souza, Ana', 'RH'],
    ]);
    expect(parseDelimited('Nome,Área\n"Ana ""Aninha"" Souza",RH')[1][0]).toBe('Ana "Aninha" Souza');
  });
});

describe('nomes digitados na caixa de texto', () => {
  it('um nome por linha, sem área', () => {
    expect(readPeople(parseDelimited('Ana Souza\nBruno Lima\n\nCarla Dias\n')).people.map((p) => p.name)).toEqual(['Ana Souza', 'Bruno Lima', 'Carla Dias']);
  });
  it('nome; área, com espaços soltos', () => {
    expect(readPeople(parseDelimited('Ana Souza; Financeiro\nBruno Lima ;Financeiro\nDiego Rocha;  Marketing')).people).toEqual([
      { name: 'Ana Souza', area: 'Financeiro' },
      { name: 'Bruno Lima', area: 'Financeiro' },
      { name: 'Diego Rocha', area: 'Marketing' },
    ]);
  });
});

describe('readPeople', () => {
  it('acha as colunas pelo cabeçalho, em qualquer ordem e com sinônimos', () => {
    const { people } = readPeople([
      ['Departamento', 'Nome completo'],
      ['TI', '  Bruno   Lima '],
    ]);
    expect(people).toEqual([{ name: 'Bruno Lima', area: 'TI' }]);
  });
  it('sem cabeçalho: coluna A é o nome e B a área; ignora linhas vazias', () => {
    const { people, skipped } = readPeople([['Ana', 'RH'], [], ['', ''], ['Bia', ''], ['', 'TI']]);
    expect(people).toEqual([
      { name: 'Ana', area: 'RH' },
      { name: 'Bia', area: '' },
    ]);
    expect(skipped).toBe(1);
  });
  it('números e células vazias do Excel viram texto', () => {
    expect(readPeople([['Nome', 'Área'], ['Ana', 42], ['Bia', null]]).people).toEqual([
      { name: 'Ana', area: '42' },
      { name: 'Bia', area: '' },
    ]);
  });
});

const people = (spec: Record<string, number>) =>
  Object.entries(spec).flatMap(([area, n]) => Array.from({ length: n }, (_, i) => ({ name: `${area} pessoa ${i + 1}`, area })));

describe('planGroups', () => {
  it('um grupo por área', () => {
    const p = planGroups(people({ Financeiro: 5, Marketing: 4 }), 'area');
    expect(p.errors).toEqual([]);
    expect(p.groups.map((g) => [g.area, g.people.length])).toEqual([
      ['Financeiro', 5],
      ['Marketing', 4],
    ]);
  });
  it('áreas com menos de 3 entram juntas em "Outras áreas"', () => {
    const p = planGroups(people({ Financeiro: 5, Jurídico: 2, Compras: 1 }), 'area');
    expect(p.groups.map((g) => [g.area, g.people.length])).toEqual([
      ['Financeiro', 5],
      [OTHER_AREAS, 3],
    ]);
    expect(p.notices[0]).toContain('Jurídico, Compras');
  });
  it('sobra pequena demais vai para o menor grupo', () => {
    const p = planGroups(people({ Financeiro: 5, Marketing: 4, Jurídico: 2 }), 'area');
    expect(p.errors).toEqual([]);
    expect(p.groups.find((g) => g.area === 'Marketing')!.people.length).toBe(6);
  });
  it('área com mais de 50 é dividida em partes parecidas', () => {
    const p = planGroups(people({ Operações: 120 }), 'area');
    expect(p.groups.map((g) => g.people.length)).toEqual([40, 40, 40]);
    expect(p.groups.map((g) => g.area)).toEqual(['Operações 1', 'Operações 2', 'Operações 3']);
    expect(p.groups.every((g) => g.people.length <= 50)).toBe(true);
    // blocos seguidos, na ordem da planilha
    expect(p.groups[0].people[0]).toBe('Operações pessoa 1');
    expect(p.groups[0].people[39]).toBe('Operações pessoa 40');
    expect(planGroups(people({ X: 101 }), 'area').groups.map((g) => g.people.length)).toEqual([34, 34, 33]);
  });
  it('mesma área com grafias diferentes de maiúsculas fica junta', () => {
    const p = planGroups([{ name: 'A', area: 'RH' }, { name: 'B', area: 'rh' }, { name: 'C', area: 'Rh' }], 'area');
    expect(p.groups).toHaveLength(1);
  });
  it('nome repetido na mesma área é erro, a não ser com dedupe', () => {
    const rows = [
      { name: 'Ana Souza', area: 'RH' },
      { name: 'ana souza', area: 'RH' },
      { name: 'Bia', area: 'RH' },
      { name: 'Caio', area: 'RH' },
    ];
    const p = planGroups(rows, 'area');
    expect(p.errors[0]).toContain('Ana Souza');
    expect(p.duplicates).toBe(1);
    const fixed = planGroups(rows, 'area', { dedupe: true });
    expect(fixed.errors).toEqual([]);
    expect(fixed.groups[0].people).toEqual(['Ana Souza', 'Bia', 'Caio']);
  });
  it('mesmo nome em áreas diferentes pode (são grupos diferentes)', () => {
    const p = planGroups([...people({ RH: 3, TI: 3 }), { name: 'RH pessoa 1', area: 'TI' }], 'area');
    expect(p.errors).toEqual([]);
  });
  it('grupo único acima de 50 pede a coluna Área', () => {
    const p = planGroups(people({ X: 60 }), 'single');
    expect(p.groups).toEqual([]);
    expect(p.errors[0]).toContain('Área');
  });
  it('sem área nenhuma, vira um grupo só sem nome de área', () => {
    const p = planGroups([{ name: 'A', area: '' }, { name: 'B', area: '' }, { name: 'C', area: '' }], 'area');
    expect(p.groups).toEqual([{ area: '', people: ['A', 'B', 'C'] }]);
  });
  it('planilha vazia explica o que fazer', () => {
    expect(planGroups([], 'area').errors[0]).toContain('coluna Nome');
  });
});

describe('pickSheet', () => {
  it('sem a aba Participantes, usa a primeira com nomes que não seja o exemplo', () => {
    const s = pickSheet([
      { sheet: 'Exemplo', data: [['Nome'], ['Ana']] },
      { sheet: 'Plan1', data: [] },
      { sheet: 'Plan2', data: [['Nome'], ['Bia']] },
    ]);
    expect(s?.sheet).toBe('Plan2');
  });
});

describe('groupName', () => {
  it('prefixo + área, até 60 letras', () => {
    expect(groupName('Amigo secreto 2026', 'Financeiro')).toBe('Amigo secreto 2026 · Financeiro');
    expect(groupName('', '')).toBe('Amigo secreto');
    expect(groupName('x'.repeat(70), 'TI').length).toBe(60);
  });
});

describe('modelo para baixar (public/modelos)', () => {
  it('o .xlsx abre na aba Participantes vazia e o exemplo segue o padrão', async () => {
    const path = await import('node:path');
    const { default: readXlsxFile } = await import('read-excel-file/node');
    const file = path.resolve(__dirname, '../public/modelos/amigo-secreto-empresa.xlsx');
    const sheets = (await readXlsxFile(file)) as unknown as Array<{ sheet: string; data: unknown[][] }>;
    // a aba que a empresa preenche vem vazia: o exemplo nunca entra por engano
    const chosen = pickSheet(sheets)!;
    expect(chosen.sheet).toBe('Participantes');
    expect(readPeople(chosen.data).people).toEqual([]);
    const exemplo = sheets.find((s) => s.sheet === 'Exemplo')!.data;
    const plan = planGroups(readPeople(exemplo).people, 'area');
    expect(plan.errors).toEqual([]);
    expect(plan.groups.map((g) => [g.area, g.people.length])).toEqual([
      ['Financeiro', 3],
      ['Marketing', 4],
    ]);
  });
  it('o .csv tem o mesmo cabeçalho', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const csv = fs.readFileSync(path.resolve(__dirname, '../public/modelos/amigo-secreto-empresa.csv'), 'utf8');
    expect(parseDelimited(csv)[0]).toEqual(['Nome', 'Área']);
  });
});

describe('planGroups — integração entre áreas', () => {
  it('um grupo só, com exclusão entre cada par da mesma área, e o sorteio sai', () => {
    const p = planGroups(people({ Financeiro: 6, Marketing: 5, TI: 4 }), 'mixed');
    expect(p.errors).toEqual([]);
    expect(p.groups).toHaveLength(1);
    const g = p.groups[0];
    expect(g.people).toHaveLength(15);
    // C(6,2) + C(5,2) + C(4,2)
    expect(g.exclusions).toHaveLength(15 + 10 + 6);
    for (const [i, j] of g.exclusions!) expect(g.people[i].split(' ')[0]).toBe(g.people[j].split(' ')[0]);
    const ids = g.people.map((_, i) => String(i));
    const ex = g.exclusions!.map(([i, j]) => [String(i), String(j)] as [string, string]);
    for (let k = 0; k < 50; k++) {
      const r = draw({ ids, exclusions: ex, maxTries: 50 });
      expect(r.ok).toBe(true);
      if (r.ok) expect(validatePairs(r.pairs, ids, ex, true)).toBeNull();
    }
  });
  it('área com mais da metade das pessoas trava, com o motivo', () => {
    const p = planGroups(people({ Vendas: 6, RH: 3, TI: 2 }), 'mixed');
    expect(p.groups).toEqual([]);
    expect(p.errors[0]).toContain('Vendas tem 6 de 11');
  });
  it('exatamente metade funciona', () => {
    expect(planGroups(people({ Vendas: 5, RH: 3, TI: 2 }), 'mixed').errors).toEqual([]);
  });
  it('sem coluna Área, pede a área', () => {
    const p = planGroups([{ name: 'A', area: '' }, { name: 'B', area: '' }, { name: 'C', area: '' }], 'mixed');
    expect(p.errors.join(' ')).toContain('coluna Área');
  });
  it('acima de 50 pessoas sugere um grupo por área', () => {
    const p = planGroups(people({ A: 20, B: 20, C: 20 }), 'mixed');
    expect(p.errors[0]).toContain('um grupo por área');
  });
  it('quem está sem área pode tirar qualquer um', () => {
    const p = planGroups([...people({ RH: 2, TI: 2 }), { name: 'Zé', area: '' }], 'mixed');
    expect(p.errors).toEqual([]);
    expect(p.groups[0].exclusions).toEqual([[0, 1], [2, 3]]);
    expect(p.notices.join(' ')).toContain('sem área');
  });
  it('nome repetido: erro, ou uma linha só com dedupe', () => {
    const rows = [...people({ RH: 3, TI: 3 }), { name: 'RH pessoa 1', area: 'TI' }];
    expect(planGroups(rows, 'mixed').errors[0]).toContain('RH pessoa 1');
    const fixed = planGroups(rows, 'mixed', { dedupe: true });
    expect(fixed.errors).toEqual([]);
    expect(fixed.groups[0].people).toHaveLength(6);
  });
});
