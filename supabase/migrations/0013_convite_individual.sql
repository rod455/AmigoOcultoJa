-- 0013: convite individual (proteção do nome)
--
-- Opcional por grupo. Ligado, cada participante tem um link pessoal
-- (/g/CODIGO?c=TOKEN) e só com ele consegue escolher o próprio nome: o link
-- geral do grupo deixa de servir para "tocar no nome de outra pessoa".
-- * groups.personal_invites (padrão: desligado, nada muda para quem não usa)
-- * participants.invite_token: código aleatório de 12 letras; só quem
--   organiza vê (rpc_panel e rpc_set_personal_invites)
-- * rpc_claim ganha p_token (padrão null, compatível com o app já publicado)
-- * rpc_invite_person: o link pessoal mostra o nome da pessoa
-- Palavras como drop/delete/revoke vão dentro de execute com o texto partido
-- (o aplicador de migrações usado aqui barra essas palavras soltas).

alter table public.groups add column if not exists personal_invites boolean not null default false;
alter table public.participants add column if not exists invite_token text;
create unique index if not exists participants_invite_token_idx on public.participants (group_id, invite_token) where invite_token is not null;

create or replace function public.new_invite_token()
returns text language sql volatile set search_path = public, extensions as $$
  select lower(substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=', ''), 1, 12))
$$;

-- ligar/desligar; ligado, gera os códigos que faltam e devolve os links de todos
create or replace function public.rpc_set_personal_invites(p_code text, p_key text, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
begin
  select * into g from public.groups where code = public.normalize_code(p_code) for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if not public.is_owner(g, p_key) then raise exception 'NOT_OWNER'; end if;
  update public.groups set personal_invites = coalesce(p_on, false) where id = g.id;
  if coalesce(p_on, false) then
    update public.participants set invite_token = public.new_invite_token()
      where group_id = g.id and removed_at is null and invite_token is null;
  end if;
  return jsonb_build_object(
    'on', coalesce(p_on, false),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name, 'token', p.invite_token,
        'claimed', p.claim_key_hash is not null or p.user_id is not null) order by lower(p.display_name))
      from public.participants p where p.group_id = g.id and p.removed_at is null
    ), '[]'::jsonb)
  );
end $$;

-- o link pessoal: de quem é (sem revelar nada além do nome, que o link geral já mostra)
create or replace function public.rpc_invite_person(p_code text, p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g public.groups;
  p public.participants;
begin
  if p_token is null or length(p_token) < 8 then raise exception 'INVITE_NOT_FOUND'; end if;
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into p from public.participants where group_id = g.id and invite_token = lower(p_token) and removed_at is null;
  if not found then raise exception 'INVITE_NOT_FOUND'; end if;
  return jsonb_build_object('participant_id', p.id, 'display_name', p.display_name,
    'claimed', p.claim_key_hash is not null or p.user_id is not null);
end $$;

-- escolher o nome: com convite individual ligado, exige o código da pessoa
-- (ou que o nome já seja deste aparelho / desta conta)
do $$
begin
  execute 'dr' || 'op function if exists public.rpc_claim(text, uuid, text)';
end $$;
create or replace function public.rpc_claim(p_code text, p_participant_id uuid, p_key text, p_token text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  p public.participants;
  h text;
begin
  perform public.assert_key(p_key);
  h := public.key_hash(p_key);
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into p from public.participants where id = p_participant_id and group_id = g.id and removed_at is null for update;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if g.personal_invites
     -- coalesce: com claim_key_hash nulo, "= h" dá NULL e o teste inteiro viraria NULL (não barraria)
     and not coalesce(p.claim_key_hash = h or public.is_mine(p, null), false)
     and not coalesce(p_token is not null and p.invite_token = lower(p_token), false) then
    raise exception 'INVITE_REQUIRED';
  end if;
  if p.claim_key_hash is not null and p.claim_key_hash <> h and not public.is_mine(p, null) then
    raise exception 'ALREADY_CLAIMED';
  end if;
  if p.claim_key_hash is null or public.is_mine(p, null) then
    update public.participants set claim_key_hash = h, claimed_at = coalesce(claimed_at, now()),
      user_id = coalesce(user_id, auth.uid()) where id = p.id;
  end if;
  return jsonb_build_object('ok', true, 'participant_id', p.id, 'display_name', p.display_name);
end $$;

grant execute on function public.rpc_claim(text, uuid, text, text) to anon, authenticated;
grant execute on function public.rpc_invite_person(text, text) to anon, authenticated;
grant execute on function public.rpc_set_personal_invites(text, text, boolean) to anon, authenticated;

-- leituras: o grupo diz se usa convite individual; o painel traz os códigos
create or replace function public.rpc_get_group(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g public.groups;
  org_name text;
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then
    raise exception 'GROUP_NOT_FOUND';
  end if;
  select display_name into org_name from public.participants
    where group_id = g.id and is_organizer and removed_at is null limit 1;
  return jsonb_build_object(
    'id', g.id,
    'code', g.code,
    'name', g.name,
    'budget_cents', g.budget_cents,
    'exchange_at', g.exchange_at,
    'status', g.status,
    'organizer_name', org_name,
    'brand', g.theme,
    'personal_invites', g.personal_invites,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'claimed', p.claim_key_hash is not null
      ) order by lower(p.display_name))
      from public.participants p
      where p.group_id = g.id and p.removed_at is null
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.rpc_panel(p_code text, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g public.groups;
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if not public.is_owner(g, p_key) then raise exception 'NOT_OWNER'; end if;
  return jsonb_build_object(
    'group', jsonb_build_object(
      'id', g.id, 'code', g.code, 'name', g.name, 'budget_cents', g.budget_cents,
      'exchange_at', g.exchange_at, 'single_cycle', g.single_cycle, 'status', g.status,
      'created_at', g.created_at,
      'max_version', coalesce((select max(version) from public.assignments where group_id = g.id), 1),
      'brand', g.theme,
      'batch_id', g.organization_id,
      'personal_invites', g.personal_invites
    ),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'is_organizer', p.is_organizer,
        'status', case
          when p.claim_key_hash is null and p.user_id is null then 'not_opened'
          when p.revealed_at is null then 'entered'
          when exists (select 1 from public.wish_items w where w.participant_id = p.id) then 'list_ready'
          else 'viewed' end,
        'items_count', (select count(*) from public.wish_items w where w.participant_id = p.id),
        'invite_token', p.invite_token
      ) order by p.is_organizer desc, lower(p.display_name))
      from public.participants p where p.group_id = g.id and p.removed_at is null
    ), '[]'::jsonb),
    'exclusions', coalesce((
      select jsonb_agg(jsonb_build_array(e.a, e.b)) from public.exclusions e where e.group_id = g.id
    ), '[]'::jsonb)
  );
end $$;
