import { describe, expect, it } from 'vitest';
import {
  addParticipant,
  draw,
  removeParticipant,
  validatePairs,
  type Pair,
} from '../supabase/functions/_shared/draw';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const ROUNDS = Number(process.env.DRAW_ROUNDS ?? 10_000);

function expectValid(pairs: Pair[], list: string[], ex: Array<[string, string]>, single: boolean) {
  const err = validatePairs(pairs, list, ex, single);
  if (err) throw new Error(err);
}

describe('draw — regras básicas', () => {
  for (const n of [3, 4, 10, 50]) {
    for (const single of [true, false]) {
      it(`n=${n} singleCycle=${single}: ${ROUNDS} sorteios válidos, sem restrições`, () => {
        const list = ids(n);
        for (let i = 0; i < ROUNDS; i++) {
          const r = draw({ ids: list, singleCycle: single });
          expect(r.ok).toBe(true);
          if (r.ok) expectValid(r.pairs, list, [], single);
        }
      });
    }
  }

  for (const n of [4, 10, 50]) {
    for (const single of [true, false]) {
      it(`n=${n} singleCycle=${single}: ${ROUNDS} sorteios válidos, com restrições`, () => {
        const list = ids(n);
        // casais: (0,1), (2,3) ... metade dos participantes em pares proibidos
        const ex: Array<[string, string]> = [];
        for (let i = 0; i + 1 < n; i += 4) ex.push([list[i], list[i + 1]]);
        for (let i = 0; i < ROUNDS; i++) {
          const r = draw({ ids: list, exclusions: ex, singleCycle: single });
          expect(r.ok).toBe(true);
          if (r.ok) expectValid(r.pairs, list, ex, single);
        }
      });
    }
  }

  it('n=4 corrente única com casais (0,1) e (2,3) tem solução', () => {
    const list = ids(4);
    const ex: Array<[string, string]> = [[list[0], list[1]], [list[2], list[3]]];
    for (let i = 0; i < 1000; i++) {
      const r = draw({ ids: list, exclusions: ex });
      expect(r.ok).toBe(true);
      if (r.ok) expectValid(r.pairs, list, ex, true);
    }
  });

  it('exclusões densas forçam backtracking e ainda saem válidas', () => {
    const list = ids(12);
    // cada um só pode tirar 3 pessoas (as 3 seguintes)
    const ex: Array<[string, string]> = [];
    for (let i = 0; i < 12; i++) {
      for (let d = 4; d <= 8; d++) ex.push([list[i], list[(i + d) % 12]]);
    }
    for (let i = 0; i < 200; i++) {
      const r = draw({ ids: list, exclusions: ex, maxTries: 1 });
      expect(r.ok).toBe(true);
      if (r.ok) expectValid(r.pairs, list, ex, true);
    }
  });
});

describe('draw — distribuição uniforme', () => {
  it('n=5 corrente única: cada destinatário possível aparece ~1/4 das vezes', () => {
    const list = ids(5);
    const counts = new Map<string, number>();
    const N = 40_000;
    for (let i = 0; i < N; i++) {
      const r = draw({ ids: list });
      if (!r.ok) throw new Error('falhou');
      for (const p of r.pairs) counts.set(`${p.giver}>${p.receiver}`, (counts.get(`${p.giver}>${p.receiver}`) ?? 0) + 1);
    }
    const expected = N / 4;
    for (const g of list) {
      for (const r of list) {
        if (g === r) continue;
        const c = counts.get(`${g}>${r}`) ?? 0;
        // tolerância de 5% (desvio padrão ≈ sqrt(N·p·(1−p)) ≈ 87, 5% ≈ 500)
        expect(Math.abs(c - expected) / expected).toBeLessThan(0.05);
      }
    }
  });

  it('n=4 sem corrente única: desarranjos uniformes (9 possíveis)', () => {
    const list = ids(4);
    const counts = new Map<string, number>();
    const N = 36_000;
    for (let i = 0; i < N; i++) {
      const r = draw({ ids: list, singleCycle: false });
      if (!r.ok) throw new Error('falhou');
      const k = r.pairs.map((p) => p.receiver).join(',');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBe(9);
    for (const c of counts.values()) expect(Math.abs(c - N / 9) / (N / 9)).toBeLessThan(0.06);
  });
});

describe('draw — casos impossíveis', () => {
  it('n=3 com um par proibido em corrente única é impossível e aponta o par', () => {
    const list = ids(3);
    const r = draw({ ids: list, exclusions: [[list[0], list[1]]] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('DRAW_IMPOSSIBLE');
      expect(r.blocking).toEqual([[list[0], list[1]]]);
      expect(r.participants).toContain(list[0]);
    }
  });

  it('n=3 com um par proibido SEM corrente única também é impossível', () => {
    const list = ids(3);
    const r = draw({ ids: list, exclusions: [[list[0], list[1]]], singleCycle: false });
    expect(r.ok).toBe(false);
  });

  it('uma pessoa proibida com todas as outras é impossível', () => {
    const list = ids(6);
    const ex: Array<[string, string]> = list.slice(1).map((o) => [list[0], o]);
    const r = draw({ ids: list, exclusions: ex, singleCycle: false });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('DRAW_IMPOSSIBLE');
      expect(r.participants).toContain(list[0]);
      expect(r.blocking?.length).toBe(5);
    }
  });

  it('menos de 3 pessoas', () => {
    expect(draw({ ids: ids(2) }).ok).toBe(false);
    const r = draw({ ids: ids(2) });
    if (!r.ok) expect(r.code).toBe('TOO_FEW');
  });

  it('mais de 50 pessoas', () => {
    const r = draw({ ids: ids(51) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('TOO_MANY');
  });

  it('ids duplicados', () => {
    const r = draw({ ids: ['a', 'b', 'a'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('DUPLICATE');
  });
});

describe('reparo — remover participante', () => {
  it('A → X → B vira A → B e só A muda', () => {
    const list = ids(6);
    for (let i = 0; i < 500; i++) {
      const d = draw({ ids: list });
      if (!d.ok) throw new Error('x');
      const x = list[2];
      const before = new Map(d.pairs.map((p) => [p.giver, p.receiver]));
      const a = d.pairs.find((p) => p.receiver === x)!.giver;
      const b = before.get(x)!;
      const r = removeParticipant(d.pairs, x, {});
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.redrawn).toBe(false);
        expect(r.changedGivers).toEqual([a]);
        const after = new Map(r.pairs.map((p) => [p.giver, p.receiver]));
        expect(after.get(a)).toBe(b);
        expectValid(r.pairs, list.filter((p) => p !== x), [], true);
      }
    }
  });

  it('se A–B é proibido, faz a menor troca local mantendo corrente única', () => {
    const list = ids(6);
    let localFixes = 0;
    for (let i = 0; i < 500; i++) {
      const d = draw({ ids: list });
      if (!d.ok) throw new Error('x');
      const x = list[2];
      const a = d.pairs.find((p) => p.receiver === x)!.giver;
      const b = d.pairs.find((p) => p.giver === x)!.receiver;
      const ex: Array<[string, string]> = [[a, b]];
      const r = removeParticipant(d.pairs, x, { exclusions: ex });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expectValid(r.pairs, list.filter((p) => p !== x), ex, true);
        if (!r.redrawn) {
          localFixes++;
          expect(r.changedGivers.length).toBe(3);
          expect(r.changedGivers).toContain(a);
        }
      }
    }
    expect(localFixes).toBeGreaterThan(400);
  });

  it('sem corrente única, troca de receptores muda 2 pessoas', () => {
    const list = ids(6);
    for (let i = 0; i < 300; i++) {
      const d = draw({ ids: list, singleCycle: false });
      if (!d.ok) throw new Error('x');
      const x = list[1];
      const a = d.pairs.find((p) => p.receiver === x)!.giver;
      const b = d.pairs.find((p) => p.giver === x)!.receiver;
      const ex: Array<[string, string]> = a === b ? [] : [[a, b]];
      const r = removeParticipant(d.pairs, x, { exclusions: ex, singleCycle: false });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expectValid(r.pairs, list.filter((p) => p !== x), ex, false);
        if (!r.redrawn) expect(r.changedGivers.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('não deixa cair abaixo de 3', () => {
    const d = draw({ ids: ids(3) });
    if (!d.ok) throw new Error('x');
    const r = removeParticipant(d.pairs, 'p0', {});
    expect(r.ok).toBe(false);
  });
});

describe('reparo — adicionar participante', () => {
  it('A → B vira A → Y → B e só A muda', () => {
    const list = ids(5);
    for (let i = 0; i < 500; i++) {
      const d = draw({ ids: list });
      if (!d.ok) throw new Error('x');
      const r = addParticipant(d.pairs, 'novo', {});
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.redrawn).toBe(false);
        expect(r.changedGivers.length).toBe(1);
        const after = new Map(r.pairs.map((p) => [p.giver, p.receiver]));
        const a = r.changedGivers[0];
        expect(after.get(a)).toBe('novo');
        const bBefore = d.pairs.find((p) => p.giver === a)!.receiver;
        expect(after.get('novo')).toBe(bBefore);
        expectValid(r.pairs, list.concat('novo'), [], true);
      }
    }
  });

  it('respeita exclusões do novo participante', () => {
    const list = ids(5);
    const ex: Array<[string, string]> = [['novo', 'p0'], ['novo', 'p1']];
    for (let i = 0; i < 300; i++) {
      const d = draw({ ids: list });
      if (!d.ok) throw new Error('x');
      const r = addParticipant(d.pairs, 'novo', { exclusions: ex });
      expect(r.ok).toBe(true);
      if (r.ok) expectValid(r.pairs, list.concat('novo'), ex, true);
    }
  });
});
