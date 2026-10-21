// Edge Function `apple_conta`: guarda e revoga o token do "Entrar com a Apple".
//
// A App Store (diretriz 5.1.1(v)) pede que, ao excluir a conta, o app revogue
// o acesso dado pelo "Entrar com a Apple" (appleid.apple.com/auth/revoke).
// Para revogar é preciso um token da Apple, que só sai trocando o
// authorizationCode do login (vale 5 minutos) com um client_secret assinado
// pela chave .p8 do time.
//
// POST { action: 'guardar', code }  (logo depois do login com a Apple)
// POST { action: 'revogar' }        (antes de rpc_delete_my_account)
// Authorization: JWT do usuário. Sempre responde 200 com { ok, motivo? }:
// o app nunca trava o login nem a exclusão por causa desta função.
//
// Segredos (Supabase › Edge Functions › Secrets): APPLE_KEY_ID e
// APPLE_PRIVATE_KEY (conteúdo do .p8, chave com "Sign in with Apple").
// Opcionais: APPLE_TEAM_ID (padrão GGM89XNN4S) e APPLE_CLIENT_ID (padrão
// br.com.amigoocultoja.app). Sem a chave, a função só registra que não deu.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? 'GGM89XNN4S';
const CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID') ?? 'br.com.amigoocultoja.app';
const KEY_ID = Deno.env.get('APPLE_KEY_ID') ?? '';
const PRIVATE_KEY = Deno.env.get('APPLE_PRIVATE_KEY') ?? '';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));

/** client_secret da Apple: JWT ES256 assinado com a chave .p8. */
async function clientSecret(): Promise<string> {
  const pem = PRIVATE_KEY.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlText(JSON.stringify({ alg: 'ES256', kid: KEY_ID }));
  const body = b64urlText(JSON.stringify({ iss: TEAM_ID, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: CLIENT_ID }));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

async function appleForm(path: string, fields: Record<string, string>): Promise<Response> {
  return await fetch(`https://appleid.apple.com/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: await clientSecret(), ...fields }),
    signal: AbortSignal.timeout(10000),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, motivo: 'METHOD' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: who } = await admin.auth.getUser(token);
  const userId = who.user?.id;
  if (!userId) return json({ ok: false, motivo: 'LOGIN_REQUIRED' }, 401);

  let body: { action?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, motivo: 'BAD_JSON' }, 400);
  }
  if (!KEY_ID || !PRIVATE_KEY) return json({ ok: false, motivo: 'SEM_CHAVE' });

  try {
    if (body.action === 'guardar') {
      if (!body.code) return json({ ok: false, motivo: 'SEM_CODIGO' });
      const res = await appleForm('token', { code: body.code, grant_type: 'authorization_code' });
      const data = (await res.json().catch(() => ({}))) as { refresh_token?: string; error?: string };
      if (!res.ok || !data.refresh_token) return json({ ok: false, motivo: data.error ?? `APPLE_${res.status}` });
      await admin.from('apple_tokens').upsert({ user_id: userId, refresh_token: data.refresh_token, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }
    if (body.action === 'revogar') {
      const { data: row } = await admin.from('apple_tokens').select('refresh_token').eq('user_id', userId).maybeSingle();
      if (!row) return json({ ok: false, motivo: 'SEM_TOKEN' });
      const res = await appleForm('revoke', { token: row.refresh_token, token_type_hint: 'refresh_token' });
      if (res.ok) await admin.from('apple_tokens').delete().eq('user_id', userId);
      return json({ ok: res.ok, motivo: res.ok ? undefined : `APPLE_${res.status}` });
    }
    return json({ ok: false, motivo: 'BAD_ACTION' }, 400);
  } catch (e) {
    return json({ ok: false, motivo: e instanceof Error ? e.message.slice(0, 120) : 'ERRO' });
  }
});
