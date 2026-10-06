// Edge Function `repair_group`: remove ou adiciona uma pessoa depois do
// sorteio com o reparo mínimo (spec §9.3). Só o organizador (chave do
// aparelho que criou o grupo) pode chamar. Nunca devolve quem tirou quem,
// nem quais pessoas tiveram o resultado alterado (isso revelaria a nova
// atribuição ao organizador). Devolve só quantas mudaram.
//
// POST { key, code, action: 'remove', participant_id }
// POST { key, code, action: 'add', name }
// → 200 { ok: true, changed_count, redrawn, version }

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { addParticipant, removeParticipant, type Pair } from '../_shared/draw.ts';

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

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Body = { key?: string; code?: string; action?: 'remove' | 'add'; participant_id?: string; name?: string };

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
  const code = (body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return json({ code: 'GROUP_NOT_FOUND', message: 'Grupo não encontrado' }, 404);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: group } = await supabase
    .from('groups')
    .select('id, code, owner_key_hash, owner_user_id, single_cycle')
    .eq('code', code)
    .maybeSingle();
  if (!group) return json({ code: 'GROUP_NOT_FOUND', message: 'Grupo não encontrado' }, 404);
  const userId = await userIdFromRequest(req);
  const isOwner = group.owner_key_hash === (await sha256Hex(key)) || (!!userId && group.owner_user_id === userId);
  if (!isOwner) return json({ code: 'NOT_OWNER', message: 'Só o organizador pode fazer isso.' }, 403);

  const [{ data: parts }, { data: assigns }, { data: excl }] = await Promise.all([
    supabase.from('participants').select('id, display_name, removed_at').eq('group_id', group.id),
    supabase.from('assignments').select('giver_id, receiver_id, version').eq('group_id', group.id),
    supabase.from('exclusions').select('a, b').eq('group_id', group.id),
  ]);
  const active = (parts ?? []).filter((p) => !p.removed_at);
  const pairs: Pair[] = (assigns ?? []).map((a) => ({ giver: a.giver_id, receiver: a.receiver_id }));
  const exclusions: Array<[string, string]> = (excl ?? []).map((e) => [e.a, e.b]);
  const currentVersion = Math.max(1, ...(assigns ?? []).map((a) => a.version ?? 1));
  const newVersion = currentVersion + 1;
  const before = new Map(pairs.map((p) => [p.giver, p.receiver]));

  if (body.action === 'remove') {
    const pid = body.participant_id;
    const target = active.find((p) => p.id === pid);
    if (!target) return json({ code: 'PARTICIPANT_NOT_FOUND', message: 'Pessoa não encontrada' }, 404);
    if (active.length - 1 < 3) return json({ code: 'TOO_FEW', message: 'O grupo precisa continuar com pelo menos 3 pessoas.' }, 422);

    const r = removeParticipant(pairs, target.id, { exclusions, singleCycle: group.single_cycle });
    if (!r.ok) {
      const nameOf = (id: string) => active.find((p) => p.id === id)?.display_name ?? '?';
      return json({ code: r.code, message: r.message, participants: (r.participants ?? []).map(nameOf) }, 422);
    }

    // grava: remove a atribuição de X, atualiza os que mudaram
    const { error: delErr } = await supabase.from('assignments').delete().eq('group_id', group.id).eq('giver_id', target.id);
    if (delErr) return json({ code: 'DB_ERROR', message: delErr.message }, 500);
    for (const p of r.pairs) {
      if (before.get(p.giver) === p.receiver) continue;
      const { error } = await supabase
        .from('assignments')
        .update({ receiver_id: p.receiver, version: newVersion, updated_at: new Date().toISOString() })
        .eq('group_id', group.id)
        .eq('giver_id', p.giver);
      if (error) return json({ code: 'DB_ERROR', message: error.message }, 500);
    }
    await supabase.from('participants').update({ removed_at: new Date().toISOString() }).eq('id', target.id);
    await supabase.from('wish_items').delete().eq('participant_id', target.id);
    await supabase.from('exclusions').delete().eq('group_id', group.id).or(`a.eq.${target.id},b.eq.${target.id}`);
    await supabase.from('events').insert({
      name: 'participant_removed',
      props: { changed: r.changedGivers.length, redrawn: r.redrawn },
      group_id: group.id,
      platform: 'edge',
    });
    return json({ ok: true, changed_count: r.changedGivers.length, redrawn: r.redrawn, version: newVersion });
  }

  if (body.action === 'add') {
    const name = (body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!name) return json({ code: 'NAME_REQUIRED', message: 'Digite o nome.' }, 422);
    if (active.some((p) => p.display_name.toLowerCase() === name.toLowerCase())) {
      return json({ code: 'DUPLICATE', message: `Já existe "${name}" no grupo. Inclua o sobrenome.` }, 422);
    }
    if (active.length + 1 > 50) return json({ code: 'TOO_MANY', message: 'O máximo é 50 pessoas.' }, 422);

    const { data: inserted, error: insErr } = await supabase
      .from('participants')
      .insert({ group_id: group.id, display_name: name })
      .select('id')
      .single();
    if (insErr || !inserted) return json({ code: 'DB_ERROR', message: insErr?.message ?? 'erro' }, 500);

    const r = addParticipant(pairs, inserted.id, { exclusions, singleCycle: group.single_cycle });
    if (!r.ok) {
      await supabase.from('participants').delete().eq('id', inserted.id);
      return json({ code: r.code, message: r.message }, 422);
    }
    for (const p of r.pairs) {
      if (p.giver === inserted.id) {
        const { error } = await supabase
          .from('assignments')
          .insert({ group_id: group.id, giver_id: p.giver, receiver_id: p.receiver, version: newVersion });
        if (error) return json({ code: 'DB_ERROR', message: error.message }, 500);
        continue;
      }
      if (before.get(p.giver) === p.receiver) continue;
      const { error } = await supabase
        .from('assignments')
        .update({ receiver_id: p.receiver, version: newVersion, updated_at: new Date().toISOString() })
        .eq('group_id', group.id)
        .eq('giver_id', p.giver);
      if (error) return json({ code: 'DB_ERROR', message: error.message }, 500);
    }
    await supabase.from('events').insert({
      name: 'participant_added',
      props: { changed: r.changedGivers.length, redrawn: r.redrawn },
      group_id: group.id,
      platform: 'edge',
    });
    return json({ ok: true, changed_count: r.changedGivers.length, redrawn: r.redrawn, version: newVersion, participant_id: inserted.id });
  }

  return json({ code: 'BAD_ACTION', message: 'action deve ser remove ou add' }, 400);
});
