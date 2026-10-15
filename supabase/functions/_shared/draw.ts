/**
 * Amigo Oculto Já — sorteio do amigo oculto.
 *
 * Módulo puro (sem dependências) usado pela Edge Function `draw_group`
 * (Deno) e pelos testes (Node/Vitest). Nunca roda no cliente.
 *
 * Regras (spec §9):
 *  - ninguém tira a si mesmo;
 *  - pares proibidos (simétricos) são respeitados;
 *  - "corrente única" (padrão): as atribuições formam um único ciclo;
 *  - se não existe resultado válido, devolve DRAW_IMPOSSIBLE dizendo
 *    quais restrições travam o sorteio.
 */

export type Pair = { giver: string; receiver: string };

export type DrawInput = {
  /** ids dos participantes ativos (n >= 3, n <= 50) */
  ids: string[];
  /** pares que não podem se tirar (a ordem dentro do par não importa) */
  exclusions?: Array<[string, string]>;
  /** padrão true */
  singleCycle?: boolean;
  /** tentativas aleatórias antes do backtracking (padrão 2000) */
  maxTries?: number;
  /** gerador: inteiro uniforme em [0, n). Padrão: crypto.getRandomValues */
  rng?: (n: number) => number;
};

export type DrawFailureCode = 'TOO_FEW' | 'TOO_MANY' | 'DUPLICATE' | 'DRAW_IMPOSSIBLE';

export type DrawResult =
  | { ok: true; pairs: Pair[] }
  | {
      ok: false;
      code: DrawFailureCode;
      message: string;
      /** pares proibidos que causam o bloqueio (quando DRAW_IMPOSSIBLE) */
      blocking?: Array<[string, string]>;
      /** participantes envolvidos no bloqueio */
      participants?: string[];
    };

export const MIN_PARTICIPANTS = 3;
export const MAX_PARTICIPANTS = 50;

/* ------------------------------------------------------------------ */
/* RNG                                                                 */
/* ------------------------------------------------------------------ */

function cryptoRng(n: number): number {
  if (n <= 1) return 0;
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues indisponível');
  }
  // rejeição para evitar viés de módulo
  const max = 0x100000000;
  const limit = max - (max % n);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    c.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

function shuffle<T>(arr: T[], rng: (n: number) => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function key(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

function buildForbidden(exclusions: Array<[string, string]> | undefined): Set<string> {
  const s = new Set<string>();
  for (const [a, b] of exclusions ?? []) {
    if (a === b) continue;
    s.add(key(a, b));
  }
  return s;
}

function allowed(forbidden: Set<string>, a: string, b: string): boolean {
  return a !== b && !forbidden.has(key(a, b));
}

/** Lista de pares proibidos que envolvem um participante. */
function exclusionsOf(id: string, exclusions: Array<[string, string]> | undefined): Array<[string, string]> {
  return (exclusions ?? []).filter(([a, b]) => a !== b && (a === id || b === id));
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

export function validatePairs(
  pairs: Pair[],
  ids: string[],
  exclusions: Array<[string, string]> | undefined,
  singleCycle: boolean,
): string | null {
  const forbidden = buildForbidden(exclusions);
  const idSet = new Set(ids);
  if (pairs.length !== ids.length) return `esperava ${ids.length} pares, veio ${pairs.length}`;
  const givers = new Set<string>();
  const receivers = new Set<string>();
  const next = new Map<string, string>();
  for (const p of pairs) {
    if (!idSet.has(p.giver) || !idSet.has(p.receiver)) return `id desconhecido em ${p.giver}->${p.receiver}`;
    if (p.giver === p.receiver) return `${p.giver} tirou a si mesmo`;
    if (!allowed(forbidden, p.giver, p.receiver)) return `${p.giver}->${p.receiver} é par proibido`;
    if (givers.has(p.giver)) return `${p.giver} dá duas vezes`;
    if (receivers.has(p.receiver)) return `${p.receiver} recebe duas vezes`;
    givers.add(p.giver);
    receivers.add(p.receiver);
    next.set(p.giver, p.receiver);
  }
  if (singleCycle) {
    let cur = ids[0];
    let steps = 0;
    do {
      cur = next.get(cur)!;
      steps++;
    } while (cur !== ids[0] && steps <= ids.length);
    if (steps !== ids.length) return `não forma corrente única (ciclo de ${steps})`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Sorteio                                                             */
/* ------------------------------------------------------------------ */

export function draw(input: DrawInput): DrawResult {
  const ids = input.ids;
  const rng = input.rng ?? cryptoRng;
  const singleCycle = input.singleCycle ?? true;
  const maxTries = input.maxTries ?? 2000;
  const exclusions = input.exclusions ?? [];

  if (new Set(ids).size !== ids.length) {
    return { ok: false, code: 'DUPLICATE', message: 'Há participantes repetidos.' };
  }
  if (ids.length < MIN_PARTICIPANTS) {
    return { ok: false, code: 'TOO_FEW', message: `Precisa de pelo menos ${MIN_PARTICIPANTS} pessoas.` };
  }
  if (ids.length > MAX_PARTICIPANTS) {
    return { ok: false, code: 'TOO_MANY', message: `O máximo é ${MAX_PARTICIPANTS} pessoas.` };
  }

  const forbidden = buildForbidden(exclusions);

  // Checagem rápida de impossibilidade: grau mínimo.
  // Corrente única precisa de grau >= 2 (um que me tira e um que eu tiro,
  // e não podem ser a mesma pessoa a não ser que n = 2). Sem corrente única,
  // basta ter alguém permitido para tirar e alguém permitido para me tirar.
  const needDegree = singleCycle ? 2 : 1;
  for (const id of ids) {
    let deg = 0;
    for (const other of ids) if (allowed(forbidden, id, other)) deg++;
    if (deg < needDegree) {
      return impossible(id, exclusions, ids);
    }
  }

  // Restrições em forma de "times" (ex.: cada um tira alguém de outra área):
  // impossível se um time tem mais da metade das pessoas; possível, a corrente
  // é montada sem busca (ver cycleFromTeams).
  const teams = teamsOf(ids, forbidden);
  if (teams) {
    const biggest = teams.reduce((a, b) => (b.length > a.length ? b : a));
    if (biggest.length > Math.floor(ids.length / 2)) return impossible(biggest[0], exclusions, ids);
  }

  const result = singleCycle ? drawCycle(ids, forbidden, rng, maxTries, teams) : drawDerangement(ids, forbidden, rng, maxTries, teams);

  if (!result) {
    // Nenhum ciclo/desarranjo válido existe. Aponta quem está mais travado.
    let worst = ids[0];
    let worstDeg = Infinity;
    for (const id of ids) {
      let deg = 0;
      for (const other of ids) if (allowed(forbidden, id, other)) deg++;
      if (deg < worstDeg) {
        worstDeg = deg;
        worst = id;
      }
    }
    return impossible(worst, exclusions, ids);
  }

  return { ok: true, pairs: result };
}

function impossible(id: string, exclusions: Array<[string, string]>, _ids: string[]): DrawResult {
  const blocking = exclusionsOf(id, exclusions);
  const participants = Array.from(new Set(blocking.flatMap((p) => p)));
  if (participants.length === 0) participants.push(id);
  return {
    ok: false,
    code: 'DRAW_IMPOSSIBLE',
    message:
      blocking.length > 0
        ? 'Com essas restrições não dá para sortear. Libere alguma delas.'
        : 'Não há combinação possível com esses participantes.',
    blocking,
    participants,
  };
}

/**
 * Se as exclusões dividem as pessoas em "times" (cada componente das
 * exclusões é completo: ninguém do time pode tirar ninguém do mesmo time),
 * devolve os times, incluindo quem não tem exclusão como time de uma pessoa.
 * Fora desse formato (ex.: A–B e B–C sem A–C), devolve null.
 */
function teamsOf(ids: string[], forbidden: Set<string>): string[][] | null {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  let any = false;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (!allowed(forbidden, ids[i], ids[j])) {
        any = true;
        parent.set(find(ids[i]), find(ids[j]));
      }
    }
  }
  if (!any) return null;
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const r = find(id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(id);
  }
  const teams = [...groups.values()];
  for (const t of teams) {
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (allowed(forbidden, t[i], t[j])) return null;
  }
  return teams;
}

/**
 * Corrente única em que vizinhos são sempre de times diferentes, montada em
 * vez de buscada: membros embaralhados, maior time primeiro (os outros em
 * ordem aleatória), a lista vai para as posições pares e depois para as
 * ímpares; no fim, rotação e sentido aleatórios. Funciona sempre que o maior
 * time tem no máximo metade das pessoas.
 */
function cycleFromTeams(teams: string[][], rng: (n: number) => number): string[] | null {
  const n = teams.reduce((s, t) => s + t.length, 0);
  const mixed = shuffle(teams, rng).map((t) => shuffle(t, rng));
  const big = mixed.reduce((bi, t, i) => (t.length > mixed[bi].length ? i : bi), 0);
  if (mixed[big].length > Math.floor(n / 2)) return null;
  const list = [mixed[big], ...mixed.filter((_, i) => i !== big)].flat();
  const evens = Math.ceil(n / 2);
  const seq: string[] = new Array(n);
  list.forEach((id, i) => {
    seq[i < evens ? 2 * i : 2 * (i - evens) + 1] = id;
  });
  const rot = rng(n);
  const out = [...seq.slice(rot), ...seq.slice(0, rot)];
  return rng(2) ? out.reverse() : out;
}

function teamCycle(ids: string[], forbidden: Set<string>, teams: string[][] | null, rng: (n: number) => number): Pair[] | null {
  if (!teams) return null;
  const order = cycleFromTeams(teams, rng);
  if (!order || order.length !== ids.length) return null;
  for (let i = 0; i < order.length; i++) if (!allowed(forbidden, order[i], order[(i + 1) % order.length])) return null;
  return order.map((g, i) => ({ giver: g, receiver: order[(i + 1) % order.length] }));
}

/** Corrente única: embaralha e testa; com times, monta a corrente; depois backtracking de ciclo hamiltoniano. */
function drawCycle(ids: string[], forbidden: Set<string>, rng: (n: number) => number, maxTries: number, teams: string[][] | null = null): Pair[] | null {
  const n = ids.length;
  for (let t = 0; t < maxTries; t++) {
    const order = shuffle(ids, rng);
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (!allowed(forbidden, order[i], order[(i + 1) % n])) {
        ok = false;
        break;
      }
    }
    if (ok) return order.map((g, i) => ({ giver: g, receiver: order[(i + 1) % n] }));
  }
  const built = teamCycle(ids, forbidden, teams, rng);
  if (built) return built;
  // Backtracking (ordem dos vizinhos aleatória para manter o sorteio imprevisível)
  const start = ids[rng(n)];
  const path: string[] = [start];
  const used = new Set<string>([start]);
  let budget = 5_000_000;
  const rest = ids.filter((x) => x !== start);
  const found = (function dfs(): boolean {
    if (budget-- <= 0) return false;
    const last = path[path.length - 1];
    if (path.length === n) return allowed(forbidden, last, start);
    for (const cand of shuffle(rest, rng)) {
      if (used.has(cand) || !allowed(forbidden, last, cand)) continue;
      used.add(cand);
      path.push(cand);
      if (dfs()) return true;
      path.pop();
      used.delete(cand);
    }
    return false;
  })();
  if (!found) return null;
  return path.map((g, i) => ({ giver: g, receiver: path[(i + 1) % n] }));
}

/** Desarranjo aleatório que respeita exclusões; com times, a corrente montada também serve; depois backtracking. */
function drawDerangement(ids: string[], forbidden: Set<string>, rng: (n: number) => number, maxTries: number, teams: string[][] | null = null): Pair[] | null {
  const n = ids.length;
  for (let t = 0; t < maxTries; t++) {
    const recv = shuffle(ids, rng);
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (!allowed(forbidden, ids[i], recv[i])) {
        ok = false;
        break;
      }
    }
    if (ok) return ids.map((g, i) => ({ giver: g, receiver: recv[i] }));
  }
  const built = teamCycle(ids, forbidden, teams, rng);
  if (built) return built;
  // Backtracking: atribui receptores em ordem aleatória de doadores
  const givers = shuffle(ids, rng);
  const assigned = new Map<string, string>();
  const taken = new Set<string>();
  let budget = 5_000_000;
  const found = (function dfs(i: number): boolean {
    if (budget-- <= 0) return false;
    if (i === n) return true;
    const g = givers[i];
    for (const r of shuffle(ids, rng)) {
      if (taken.has(r) || !allowed(forbidden, g, r)) continue;
      taken.add(r);
      assigned.set(g, r);
      if (dfs(i + 1)) return true;
      taken.delete(r);
      assigned.delete(g);
    }
    return false;
  })(0);
  if (!found) return null;
  return ids.map((g) => ({ giver: g, receiver: assigned.get(g)! }));
}

/* ------------------------------------------------------------------ */
/* Reparo após o sorteio (spec §9.3)                                   */
/* ------------------------------------------------------------------ */

export type RepairResult =
  | { ok: true; pairs: Pair[]; changedGivers: string[]; redrawn: boolean }
  | { ok: false; code: DrawFailureCode; message: string; blocking?: Array<[string, string]>; participants?: string[] };

/**
 * Remove X. Em A → X → B, vira A → B. Se A–B for proibido, procura a menor
 * troca local válida (mantendo corrente única quando for o caso). Se nada
 * servir, sorteia de novo (redrawn = true).
 */
export function removeParticipant(
  pairs: Pair[],
  removedId: string,
  opts: { exclusions?: Array<[string, string]>; singleCycle?: boolean; rng?: (n: number) => number },
): RepairResult {
  const rng = opts.rng ?? cryptoRng;
  const singleCycle = opts.singleCycle ?? true;
  const exclusions = (opts.exclusions ?? []).filter(([a, b]) => a !== removedId && b !== removedId);
  const forbidden = buildForbidden(exclusions);

  const next = new Map(pairs.map((p) => [p.giver, p.receiver]));
  const prev = new Map(pairs.map((p) => [p.receiver, p.giver]));
  if (!next.has(removedId)) {
    return { ok: false, code: 'DRAW_IMPOSSIBLE', message: 'Participante não está no sorteio.' };
  }
  const remaining = pairs.map((p) => p.giver).filter((g) => g !== removedId);
  if (remaining.length < MIN_PARTICIPANTS) {
    return { ok: false, code: 'TOO_FEW', message: `Precisa de pelo menos ${MIN_PARTICIPANTS} pessoas.` };
  }

  const a = prev.get(removedId)!;
  const b = next.get(removedId)!;
  const base = new Map(next);
  base.delete(removedId);

  const toPairs = (m: Map<string, string>) => remaining.map((g) => ({ giver: g, receiver: m.get(g)! }));

  // 1) A → B direto (só A muda)
  if (allowed(forbidden, a, b)) {
    const m = new Map(base);
    m.set(a, b);
    const out = toPairs(m);
    if (!validatePairs(out, remaining, exclusions, singleCycle)) {
      return { ok: true, pairs: out, changedGivers: [a], redrawn: false };
    }
  }

  if (singleCycle) {
    // 2) Mover um nó Y (U → Y → V) para entre A e B: A → Y → B, U → V. Mudam A, Y, U.
    const candidates = shuffle(
      remaining.filter((y) => y !== a && y !== b),
      rng,
    );
    for (const y of candidates) {
      const u = prev.get(y)!;
      const v = next.get(y)!;
      if (u === removedId || v === removedId) continue;
      if (!allowed(forbidden, a, y) || !allowed(forbidden, y, b) || !allowed(forbidden, u, v)) continue;
      const m = new Map(base);
      m.set(a, y);
      m.set(y, b);
      m.set(u, v);
      const out = toPairs(m);
      if (!validatePairs(out, remaining, exclusions, true)) {
        return { ok: true, pairs: out, changedGivers: [a, y, u], redrawn: false };
      }
    }
  } else {
    // 2) Trocar receptores: A → C e D → B, onde D → C antes. Mudam A e D.
    const candidates = shuffle(
      remaining.filter((d) => d !== a),
      rng,
    );
    for (const d of candidates) {
      const c = base.get(d)!;
      if (!allowed(forbidden, a, c) || !allowed(forbidden, d, b)) continue;
      const m = new Map(base);
      m.set(a, c);
      m.set(d, b);
      const out = toPairs(m);
      if (!validatePairs(out, remaining, exclusions, false)) {
        return { ok: true, pairs: out, changedGivers: [a, d], redrawn: false };
      }
    }
  }

  // 3) Sorteio novo
  const re = draw({ ids: remaining, exclusions, singleCycle, rng });
  if (!re.ok) return re;
  const changed = re.pairs.filter((p) => base.get(p.giver) !== p.receiver).map((p) => p.giver);
  return { ok: true, pairs: re.pairs, changedGivers: changed, redrawn: true };
}

/**
 * Adiciona Y: escolhe aleatoriamente uma ligação válida A → B e transforma em
 * A → Y → B. Só A muda. Se não houver ligação válida, sorteia de novo.
 */
export function addParticipant(
  pairs: Pair[],
  newId: string,
  opts: { exclusions?: Array<[string, string]>; singleCycle?: boolean; rng?: (n: number) => number },
): RepairResult {
  const rng = opts.rng ?? cryptoRng;
  const singleCycle = opts.singleCycle ?? true;
  const exclusions = opts.exclusions ?? [];
  const forbidden = buildForbidden(exclusions);
  if (pairs.some((p) => p.giver === newId)) {
    return { ok: false, code: 'DUPLICATE', message: 'Participante já está no sorteio.' };
  }
  if (pairs.length + 1 > MAX_PARTICIPANTS) {
    return { ok: false, code: 'TOO_MANY', message: `O máximo é ${MAX_PARTICIPANTS} pessoas.` };
  }
  const ids = pairs.map((p) => p.giver).concat([newId]);
  const edges = shuffle(pairs, rng);
  for (const e of edges) {
    if (!allowed(forbidden, e.giver, newId) || !allowed(forbidden, newId, e.receiver)) continue;
    const out = pairs.map((p) => (p.giver === e.giver ? { giver: p.giver, receiver: newId } : p));
    out.push({ giver: newId, receiver: e.receiver });
    if (!validatePairs(out, ids, exclusions, singleCycle)) {
      return { ok: true, pairs: out, changedGivers: [e.giver], redrawn: false };
    }
  }
  const re = draw({ ids, exclusions, singleCycle, rng });
  if (!re.ok) return re;
  const before = new Map(pairs.map((p) => [p.giver, p.receiver]));
  const changed = re.pairs.filter((p) => before.get(p.giver) !== p.receiver).map((p) => p.giver);
  return { ok: true, pairs: re.pairs, changedGivers: changed, redrawn: true };
}
