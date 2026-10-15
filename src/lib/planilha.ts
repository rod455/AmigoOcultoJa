/**
 * Planilha da empresa → grupos de sorteio. Funções puras (testes em
 * tests/planilha.test.ts). O padrão é o do modelo em public/modelos
 * (scripts/modelo-planilha.py): colunas Nome (obrigatória) e Área (opcional).
 */

export type Person = { name: string; area: string };
export type PlannedGroup = { area: string; people: string[] };
export type Plan = { groups: PlannedGroup[]; notices: string[]; errors: string[]; duplicates: number };
export type SplitMode = 'area' | 'single';

export const MIN_PER_GROUP = 3;
export const MAX_PER_GROUP = 50;
export const MAX_PEOPLE = 2000;
export const MAX_GROUPS = 60;
export const OTHER_AREAS = 'Outras áreas';
const NO_AREA = 'Sem área';

const clean = (v: unknown): string =>
  v == null ? '' : String(v).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** Texto CSV/TSV (ou colado do Excel) → linhas. Detecta ; , ou tab e respeita aspas. */
export function parseDelimited(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const counts: Array<[string, number]> = [';', '\t', ','].map((d) => [d, firstLine.split(d).length - 1]);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ';';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const NAME_HEADER = /^nome\b/i;
const AREA_HEADER = /^(área|area|setor|departamento|depto|time|equipe|unidade)\b/i;

/** Linhas da planilha → pessoas. Com cabeçalho, acha as colunas pelo nome; sem, usa A = Nome e B = Área. */
export function readPeople(rows: unknown[][]): { people: Person[]; skipped: number } {
  const cells = rows.map((r) => (Array.isArray(r) ? r.map(clean) : []));
  const start = cells.findIndex((r) => r.some((c) => c !== ''));
  if (start < 0) return { people: [], skipped: 0 };
  let nameCol = 0;
  let areaCol = 1;
  let first = start;
  const header = cells[start];
  const hName = header.findIndex((c) => NAME_HEADER.test(c));
  if (hName >= 0) {
    nameCol = hName;
    const hArea = header.findIndex((c) => AREA_HEADER.test(c));
    areaCol = hArea >= 0 ? hArea : -1;
    first = start + 1;
  }
  const people: Person[] = [];
  let skipped = 0;
  for (const r of cells.slice(first)) {
    const name = (r[nameCol] ?? '').slice(0, 60);
    const area = areaCol >= 0 ? (r[areaCol] ?? '').slice(0, 40) : '';
    if (!name) {
      if (r.some((c) => c !== '')) skipped++;
      continue;
    }
    people.push({ name, area });
  }
  return { people, skipped };
}

/**
 * O .xlsx pode ter várias abas (o modelo tem Participantes, Exemplo e Como
 * preencher). Usa "Participantes"; sem ela, a primeira aba com nomes que não
 * seja o exemplo nem as instruções.
 */
export function pickSheet(sheets: Array<{ sheet: string; data: unknown[][] }>): { sheet: string; data: unknown[][] } | null {
  const named = sheets.find((s) => /^participantes$/i.test(s.sheet.trim()));
  if (named) return named;
  const usable = sheets.filter((s) => !/^(exemplo|como preencher)$/i.test(s.sheet.trim()));
  return usable.find((s) => readPeople(s.data).people.length > 0) ?? usable[0] ?? null;
}

/** Divide em partes de tamanho parecido, em blocos seguidos (respeita a ordem da planilha). */
function splitEvenly(names: string[], parts: number): string[][] {
  const base = Math.floor(names.length / parts);
  const extra = names.length % parts;
  const out: string[][] = [];
  let at = 0;
  for (let i = 0; i < parts; i++) {
    const size = base + (i < extra ? 1 : 0);
    out.push(names.slice(at, at + size));
    at += size;
  }
  return out;
}

/**
 * Pessoas → grupos. 'area': um grupo por área (áreas pequenas juntas em
 * "Outras áreas", áreas grandes divididas); 'single': todo mundo junto.
 * Nome repetido no mesmo grupo é erro (o servidor recusa), a não ser com
 * `dedupe`, que mantém só uma linha de cada nome igual.
 */
export function planGroups(people: Person[], mode: SplitMode, opts: { dedupe?: boolean } = {}): Plan {
  const notices: string[] = [];
  const errors: string[] = [];
  if (people.length === 0) return { groups: [], notices, errors: ['A planilha não tem nenhum nome. Preencha a coluna Nome a partir da linha 2.'], duplicates: 0 };
  if (people.length > MAX_PEOPLE) errors.push(`São ${people.length} pessoas. O limite por importação é ${MAX_PEOPLE}; divida a planilha.`);

  let buckets: Array<{ area: string; people: string[] }>;
  if (mode === 'single') {
    buckets = [{ area: '', people: people.map((p) => p.name) }];
  } else {
    const byArea = new Map<string, { area: string; people: string[] }>();
    for (const p of people) {
      const area = p.area || NO_AREA;
      const k = area.toLocaleLowerCase('pt-BR');
      if (!byArea.has(k)) byArea.set(k, { area, people: [] });
      byArea.get(k)!.people.push(p.name);
    }
    buckets = [...byArea.values()];
    if (buckets.length === 1 && buckets[0].area === NO_AREA) buckets[0].area = '';
  }

  // nomes repetidos dentro de cada grupo
  let duplicates = 0;
  for (const b of buckets) {
    const seen = new Map<string, number>();
    const kept: string[] = [];
    for (const n of b.people) {
      const k = n.toLocaleLowerCase('pt-BR');
      seen.set(k, (seen.get(k) ?? 0) + 1);
      if (seen.get(k) === 1 || !opts.dedupe) kept.push(n);
    }
    const reps = [...seen.entries()].filter(([, c]) => c > 1);
    duplicates += reps.reduce((s, [, c]) => s + c - 1, 0);
    if (reps.length && !opts.dedupe) {
      const where = b.area ? ` em ${b.area}` : '';
      const names = reps.map(([k]) => b.people.find((n) => n.toLocaleLowerCase('pt-BR') === k)!).slice(0, 5);
      errors.push(`${names.join(', ')}${reps.length > 5 ? ' e outros' : ''} ${reps.length === 1 ? 'aparece' : 'aparecem'} mais de uma vez${where}. Se forem pessoas diferentes, inclua o sobrenome na planilha.`);
    }
    b.people = kept;
  }

  if (mode === 'single') {
    const n = buckets[0].people.length;
    if (n > MAX_PER_GROUP) errors.push(`São ${n} pessoas e um grupo aceita até ${MAX_PER_GROUP}. Preencha a coluna Área e escolha "um grupo por área".`);
    if (n < MIN_PER_GROUP) errors.push(`Um grupo precisa de pelo menos ${MIN_PER_GROUP} pessoas.`);
    return { groups: errors.length ? [] : buckets, notices, errors, duplicates };
  }

  // áreas pequenas → "Outras áreas"
  const small = buckets.filter((b) => b.people.length < MIN_PER_GROUP);
  let groups = buckets.filter((b) => b.people.length >= MIN_PER_GROUP);
  if (small.length) {
    const merged = { area: OTHER_AREAS, people: small.flatMap((b) => b.people) };
    const label = small.map((b) => b.area).join(', ');
    if (merged.people.length >= MIN_PER_GROUP) {
      groups.push(merged);
      notices.push(`${label}: menos de ${MIN_PER_GROUP} pessoas por área, então ${small.length === 1 ? 'entrou' : 'entraram'} juntas no grupo "${OTHER_AREAS}".`);
    } else {
      const target = [...groups].sort((a, b) => a.people.length - b.people.length)[0];
      if (target && target.people.length + merged.people.length <= MAX_PER_GROUP) {
        target.people.push(...merged.people);
        notices.push(`${label}: poucas pessoas, então ${merged.people.length === 1 ? 'entrou' : 'entraram'} no grupo ${target.area}.`);
      } else if (!target) {
        errors.push(`Um grupo precisa de pelo menos ${MIN_PER_GROUP} pessoas.`);
      } else {
        groups.push(merged);
        errors.push(`"${OTHER_AREAS}" ficou com menos de ${MIN_PER_GROUP} pessoas. Junte essas pessoas a outra área na planilha.`);
      }
    }
  }

  // áreas grandes → divididas
  groups = groups.flatMap((g) => {
    if (g.people.length <= MAX_PER_GROUP) return [g];
    const parts = Math.ceil(g.people.length / MAX_PER_GROUP);
    notices.push(`${g.area} tem ${g.people.length} pessoas e foi dividida em ${parts} grupos (o máximo é ${MAX_PER_GROUP} por grupo).`);
    return splitEvenly(g.people, parts).map((people, i) => ({ area: `${g.area} ${i + 1}`, people }));
  });

  if (groups.length > MAX_GROUPS) errors.push(`Seriam ${groups.length} grupos. O limite por importação é ${MAX_GROUPS}.`);
  return { groups: errors.length ? [] : groups, notices, errors, duplicates };
}

/** Nome de cada grupo: "Amigo secreto · Financeiro" (até 60 letras). */
export function groupName(prefix: string, area: string): string {
  const p = prefix.trim() || 'Amigo secreto';
  return (area ? `${p} · ${area}` : p).slice(0, 60);
}
