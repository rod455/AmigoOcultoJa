// Edge Function `draw_group`: cria o grupo, os participantes, as exclusões,
// sorteia e grava as atribuições. Roda com service role; o resultado nunca
// é devolvido nem registrado em log.
//
// Authorization: JWT do usuário logado (vincula o grupo à conta) ou chave anon.
// POST { key, name, budget_cents, exchange_at, single_cycle, participants: [{name, is_organizer}], exclusions: [[i, j]] }
// → 200 { code, group_id, organizer_participant_id }
// → 422 { code: 'DRAW_IMPOSSIBLE' | 'TOO_FEW' | ..., message, participants: [nome, ...] }

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { draw } from '../_shared/draw.ts';

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sem 0/O, 1/I/l

function makeCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Id do usuário logado, se o Authorization trouxer o JWT de um usuário (e não a chave anon). */
async function userIdFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === Deno.env.get('SUPABASE_ANON_KEY')) return null;
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

type Body = {
  key?: string;
  name?: string;
  budget_cents?: number | null;
  exchange_at?: string | null;
  single_cycle?: boolean;
  participants?: Array<{ name: string; is_organizer?: boolean }>;
  exclusions?: Array<[number, number]>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ code: 'METHOD', message: 'POST only' }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ code: 'BAD_JSON', message: 'JSON inválido' }, 400);
  }

  const key = (body.key ?? '').trim();
  if (key.length < 32) return json({ code: 'INVALID_KEY', message: 'Chave inválida' }, 400);

  const name = (body.name ?? '').trim().slice(0, 60);
  if (!name) return json({ code: 'NAME_REQUIRED', message: 'Dê um nome ao grupo.' }, 422);

  const rawParts = Array.isArray(body.participants) ? body.participants : [];
  const names: string[] = [];
  const seen = new Set<string>();
  let organizerIndex = -1;
  for (const p of rawParts) {
    const n = (p?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) return json({ code: 'DUPLICATE', message: `"${n}" aparece duas vezes. Inclua o sobrenome.`, participants: [n] }, 422);
    seen.add(k);
    if (p.is_organizer && organizerIndex < 0) organizerIndex = names.length;
    names.push(n);
  }
  if (names.length < 3) return json({ code: 'TOO_FEW', message: 'Precisa de pelo menos 3 pessoas.' }, 422);
  if (names.length > 50) return json({ code: 'TOO_MANY', message: 'O máximo é 50 pessoas.' }, 422);

  const singleCycle = body.single_cycle !== false;
  const budget = body.budget_cents == null ? null : Math.max(0, Math.round(Number(body.budget_cents)));
  const exchangeAt = body.exchange_at && /^\d{4}-\d{2}-\d{2}$/.test(body.exchange_at) ? body.exchange_at : null;

  // ids temporários = índice como string; mapeamos para uuids depois
  const tmpIds = names.map((_, i) => String(i));
  const exclusions: Array<[string, string]> = [];
  for (const pair of body.exclusions ?? []) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const [i, j] = pair.map(Number);
    if (!Number.isInteger(i) || !Number.isInteger(j) || i === j) continue;
    if (i < 0 || j < 0 || i >= names.length || j >= names.length) continue;
    exclusions.push([String(i), String(j)]);
  }

  const started = Date.now();
  const result = draw({ ids: tmpIds, exclusions, singleCycle });
  if (!result.ok) {
    return json(
      {
        code: result.code,
        message: result.message,
        participants: (result.participants ?? []).map((i) => names[Number(i)]),
        blocking: (result.blocking ?? []).map(([a, b]) => [names[Number(a)], names[Number(b)]]),
      },
      422,
    );
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const keyHash = await sha256Hex(key);
  const userId = await userIdFromRequest(req); // conta do organizador (Google/Apple/e-mail), quando logado

  // Código único (tenta algumas vezes em caso de colisão)
  let group: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !group; attempt++) {
    const code = makeCode();
    const { data, error } = await supabase
      .from('groups')
      .insert({
        code,
        name,
        owner_key_hash: keyHash,
        owner_user_id: userId,
        budget_cents: budget,
        exchange_at: exchangeAt,
        single_cycle: singleCycle,
        status: 'drawn',
      })
      .select('id, code')
      .single();
    if (!error && data) group = data;
    else if (error && error.code !== '23505') {
      return json({ code: 'DB_ERROR', message: error.message }, 500);
    }
  }
  if (!group) return json({ code: 'DB_ERROR', message: 'Não consegui gerar um código.' }, 500);

  const rows = names.map((n, i) => ({
    group_id: group!.id,
    display_name: n,
    is_organizer: i === organizerIndex,
    // o organizador já fica vinculado ao próprio aparelho
    claim_key_hash: i === organizerIndex ? keyHash : null,
    user_id: i === organizerIndex ? userId : null,
    claimed_at: i === organizerIndex ? new Date().toISOString() : null,
  }));
  const { data: parts, error: pErr } = await supabase.from('participants').insert(rows).select('id, display_name');
  if (pErr || !parts) {
    await supabase.from('groups').delete().eq('id', group.id);
    return json({ code: 'DB_ERROR', message: pErr?.message ?? 'erro' }, 500);
  }
  const idByName = new Map(parts.map((p) => [p.display_name, p.id as string]));
  const idOf = (tmp: string) => idByName.get(names[Number(tmp)])!;

  if (exclusions.length) {
    const exRows = exclusions.map(([a, b]) => ({ group_id: group!.id, a: idOf(a), b: idOf(b) }));
    const { error } = await supabase.from('exclusions').upsert(exRows, { ignoreDuplicates: true });
    if (error) {
      await supabase.from('groups').delete().eq('id', group.id);
      return json({ code: 'DB_ERROR', message: error.message }, 500);
    }
  }

  const aRows = result.pairs.map((p) => ({ group_id: group!.id, giver_id: idOf(p.giver), receiver_id: idOf(p.receiver), version: 1 }));
  const { error: aErr } = await supabase.from('assignments').insert(aRows);
  if (aErr) {
    await supabase.from('groups').delete().eq('id', group.id);
    return json({ code: 'DB_ERROR', message: aErr.message }, 500);
  }

  await supabase.from('events').insert({
    name: 'draw_completed',
    props: { n: names.length, tempo_ms: Date.now() - started, qtd_exclusoes: exclusions.length, single_cycle: singleCycle },
    group_id: group.id,
    platform: 'edge',
  });

  return json({
    code: group.code,
    group_id: group.id,
    organizer_participant_id: organizerIndex >= 0 ? idByName.get(names[organizerIndex]) : null,
  });
});
