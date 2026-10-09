-- Amigo Oculto Já (ex-Tirei!) — esquema inicial (MVP)
--
-- Identidade no MVP web: cada aparelho gera uma chave secreta aleatória
-- (device key). O banco guarda só o hash SHA-256 dessa chave. Nenhuma tabela
-- é acessível diretamente pelo cliente (RLS ligado e sem policies): toda
-- leitura/escrita passa por funções SECURITY DEFINER que recebem a chave e
-- devolvem apenas o que pertence a quem chamou. A tabela `assignments` só é
-- lida pela função `rpc_my_result` (o próprio resultado) e pelas Edge
-- Functions de sorteio/reparo (service role). O organizador não tem nenhum
-- privilégio extra sobre `assignments`.
--
-- As colunas `owner_user_id` / `user_id` (auth.users) ficam prontas para o
-- login do app (Apple/Google/WhatsApp OTP) e para converter a chave anônima
-- em conta sem perder o vínculo.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------
-- Fase 2 (B2B): criadas vazias desde já (spec §12)
-- ---------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email_domain text,
  theme jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member',
  primary key (organization_id, user_id)
);

-- ---------------------------------------------------------------
-- Núcleo
-- ---------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  owner_user_id uuid references auth.users on delete set null,
  owner_key_hash text not null,
  organization_id uuid references public.organizations on delete set null,
  budget_cents int,
  exchange_at date,
  single_cycle boolean not null default true,
  status text not null default 'drawn' check (status in ('draft', 'drawn', 'closed')),
  theme jsonb,
  created_at timestamptz not null default now()
);
create index if not exists groups_owner_key_hash_idx on public.groups (owner_key_hash);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  display_name text not null,
  is_organizer boolean not null default false,
  user_id uuid references auth.users on delete set null,
  claim_key_hash text,
  claimed_at timestamptz,
  revealed_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists participants_group_name_active_idx
  on public.participants (group_id, lower(display_name)) where removed_at is null;
create index if not exists participants_group_idx on public.participants (group_id);

create table if not exists public.exclusions (
  group_id uuid not null references public.groups on delete cascade,
  a uuid not null references public.participants on delete cascade,
  b uuid not null references public.participants on delete cascade,
  primary key (group_id, a, b)
);

-- Tabela sensível
create table if not exists public.assignments (
  group_id uuid not null references public.groups on delete cascade,
  giver_id uuid not null references public.participants on delete cascade,
  receiver_id uuid not null references public.participants on delete cascade,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (group_id, giver_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents int not null,
  store text not null,
  affiliate_url text not null,
  image_url text,
  tags text[],
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.wish_items (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants on delete cascade,
  title text not null,
  product_id uuid references public.products on delete set null,
  affiliate_url text not null,
  price_cents int,
  store text,
  position smallint not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  unique (participant_id, position)
);

create table if not exists public.outbound_clicks (
  id bigint generated always as identity primary key,
  group_id uuid,
  participant_id uuid,
  wish_item_id uuid,
  product_id uuid,
  store text,
  origin text,
  created_at timestamptz not null default now()
);

create table if not exists public.nudges (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups on delete cascade,
  from_participant_id uuid references public.participants on delete set null,
  to_participant_id uuid references public.participants on delete set null,
  kind text not null check (kind in ('organizador', 'anonimo')),
  created_at timestamptz not null default now()
);

-- Analytics mínimo (spec §10). PostHog/Firebase entram depois, mesmo nome de evento.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  name text not null,
  props jsonb,
  group_id uuid,
  participant_id uuid,
  platform text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

insert into public.app_settings (key, value) values
  ('affiliate_tag_amazon', 'tirei-20'),
  ('search_url_amazon', 'https://www.amazon.com.br/s?k={q}&tag={tag}'),
  ('search_url_mercadolivre', 'https://lista.mercadolivre.com.br/{q}'),
  ('default_store', 'amazon'),
  ('public_base_url', 'https://amigoocultoja.com.br')
on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- RLS: tudo ligado, nada acessível direto (exceto products ativos)
-- ---------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.groups enable row level security;
alter table public.participants enable row level security;
alter table public.exclusions enable row level security;
alter table public.assignments enable row level security;
alter table public.products enable row level security;
alter table public.wish_items enable row level security;
alter table public.outbound_clicks enable row level security;
alter table public.nudges enable row level security;
alter table public.events enable row level security;
alter table public.app_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.products to anon, authenticated;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (active);

-- ---------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------
create or replace function public.key_hash(p_key text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(p_key, 'sha256'), 'hex')
$$;

create or replace function public.assert_key(p_key text)
returns void language plpgsql immutable as $$
begin
  if p_key is null or length(p_key) < 32 then
    raise exception 'INVALID_KEY';
  end if;
end $$;

create or replace function public.normalize_code(p_code text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public.setting(p_key text)
returns text language sql stable security definer set search_path = public as $$
  select value from public.app_settings where key = p_key
$$;

create or replace function public.build_search_url(p_query text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  store text := coalesce(public.setting('default_store'), 'amazon');
  tpl text;
begin
  tpl := public.setting('search_url_' || store);
  if tpl is null then
    tpl := 'https://www.amazon.com.br/s?k={q}&tag={tag}';
  end if;
  return replace(replace(tpl, '{q}', replace(coalesce(p_query, ''), ' ', '+')),
                 '{tag}', coalesce(public.setting('affiliate_tag_amazon'), ''));
end $$;

create or replace function public.item_json(w public.wish_items)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', w.id,
    'title', w.title,
    'product_id', w.product_id,
    'price_cents', w.price_cents,
    'store', w.store,
    'position', w.position,
    'is_search', w.product_id is null
  )
$$;

-- ---------------------------------------------------------------
-- RPCs públicas (quem tem o link)
-- ---------------------------------------------------------------

-- Tela 7: dados do grupo + nomes (quem já entrou aparece desabilitado)
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

-- Tela 7 → 8: vincular o nome ao aparelho (P0-07)
create or replace function public.rpc_claim(p_code text, p_participant_id uuid, p_key text)
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
  if p.claim_key_hash is not null and p.claim_key_hash <> h then
    raise exception 'ALREADY_CLAIMED';
  end if;
  if p.claim_key_hash is null then
    update public.participants set claim_key_hash = h, claimed_at = now() where id = p.id;
  end if;
  return jsonb_build_object('ok', true, 'participant_id', p.id, 'display_name', p.display_name);
end $$;

-- Tela 8: meu resultado + lista do amigo + minha lista. Marca revealed_at.
create or replace function public.rpc_my_result(p_code text, p_participant_id uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
  a public.assignments;
  friend public.participants;
begin
  perform public.assert_key(p_key);
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into me from public.participants
    where id = p_participant_id and group_id = g.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if me.claim_key_hash is null or me.claim_key_hash <> public.key_hash(p_key) then
    raise exception 'NOT_YOURS';
  end if;
  select * into a from public.assignments where group_id = g.id and giver_id = me.id;
  if not found then raise exception 'NOT_DRAWN'; end if;
  select * into friend from public.participants where id = a.receiver_id;
  if me.revealed_at is null then
    update public.participants set revealed_at = now() where id = me.id;
  end if;
  return jsonb_build_object(
    'group', jsonb_build_object(
      'id', g.id, 'code', g.code, 'name', g.name,
      'budget_cents', g.budget_cents, 'exchange_at', g.exchange_at
    ),
    'me', jsonb_build_object('id', me.id, 'display_name', me.display_name),
    'friend', jsonb_build_object(
      'id', friend.id,
      'display_name', friend.display_name,
      'items', coalesce((select jsonb_agg(public.item_json(w) order by w.position)
                         from public.wish_items w where w.participant_id = friend.id), '[]'::jsonb)
    ),
    'version', a.version,
    'my_items', coalesce((select jsonb_agg(public.item_json(w) order by w.position)
                          from public.wish_items w where w.participant_id = me.id), '[]'::jsonb),
    -- lembretes anônimos que recebi e ainda não atendi (só contam enquanto minha lista está vazia)
    'nudges_for_me', (select count(*) from public.nudges n
                      where n.to_participant_id = me.id and n.kind = 'anonimo'
                        and not exists (select 1 from public.wish_items w where w.participant_id = me.id)),
    -- quando foi meu último lembrete para quem eu tirei (para não repetir)
    'nudged_friend_at', (select max(n.created_at) from public.nudges n
                         where n.from_participant_id = me.id and n.to_participant_id = friend.id and n.kind = 'anonimo')
  );
end $$;

-- Tela 8: salvar minha lista (até 3). p_items: [{title, product_id?}]
create or replace function public.rpc_set_wish_items(p_code text, p_participant_id uuid, p_key text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_group public.groups%rowtype;
  v_me public.participants%rowtype;
  v_item jsonb;
  v_pos int := 0;
  v_pid uuid;
  v_prod_name text;
  v_prod_url text;
  v_prod_price int;
  v_prod_store text;
  v_title text;
begin
  perform public.assert_key(p_key);
  select * into v_group from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into v_me from public.participants where id = p_participant_id and group_id = v_group.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if v_me.claim_key_hash is null or v_me.claim_key_hash <> public.key_hash(p_key) then
    raise exception 'NOT_YOURS';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 3 then
    raise exception 'TOO_MANY_ITEMS';
  end if;

  -- substitui a lista inteira
  delete from public.wish_items where participant_id = v_me.id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_pid := null; v_prod_name := null; v_prod_url := null; v_prod_price := null; v_prod_store := null;
    if (v_item->>'product_id') is not null then
      select pr.id, pr.name, pr.affiliate_url, pr.price_cents, pr.store
        into v_pid, v_prod_name, v_prod_url, v_prod_price, v_prod_store
        from public.products pr where pr.id = (v_item->>'product_id')::uuid and pr.active;
    end if;
    v_title := left(btrim(coalesce(v_item->>'title', v_prod_name, '')), 120);
    if v_title = '' then continue; end if;
    v_pos := v_pos + 1;
    if v_pid is not null then
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position)
      values (v_me.id, v_prod_name, v_pid, v_prod_url, v_prod_price, v_prod_store, v_pos);
    else
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position)
      values (v_me.id, v_title, null, public.build_search_url(v_title), null, coalesce(public.setting('default_store'), 'amazon'), v_pos);
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce((select jsonb_agg(public.item_json(w) order by w.position) from public.wish_items w where w.participant_id = v_me.id), '[]'::jsonb)
  );
end
$fn$;

-- Tela 8/9: sugestões dentro do valor, vitrine varia por participante
create or replace function public.rpc_suggestions(p_code text, p_participant_id uuid default null, p_limit int default 6)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g public.groups;
  seed text := coalesce(p_participant_id::text, '');
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pr.id, 'name', pr.name, 'price_cents', pr.price_cents,
      'store', pr.store, 'image_url', pr.image_url, 'tags', pr.tags
    ) order by md5(pr.id::text || seed))
    from (
      select * from public.products pr
      where pr.active and (g.budget_cents is null or pr.price_cents <= g.budget_cents)
      order by md5(pr.id::text || seed)
      limit greatest(1, least(coalesce(p_limit, 6), 12))
    ) pr
  ), '[]'::jsonb);
end $$;

-- Redirecionador /r: registra o clique e devolve a URL de destino
create or replace function public.rpc_resolve_link(
  p_wish_item_id uuid default null,
  p_product_id uuid default null,
  p_query text default null,
  p_code text default null,
  p_participant_id uuid default null,
  p_origin text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  url text;
  store text;
  gid uuid;
  pid uuid;
begin
  if p_code is not null then
    select id into gid from public.groups where code = public.normalize_code(p_code);
  end if;
  if p_wish_item_id is not null then
    select w.affiliate_url, w.store, w.product_id into url, store, pid from public.wish_items w where w.id = p_wish_item_id;
  elsif p_product_id is not null then
    select pr.affiliate_url, pr.store into url, store from public.products pr where pr.id = p_product_id;
    pid := p_product_id;
  elsif p_query is not null then
    url := public.build_search_url(p_query);
    store := coalesce(public.setting('default_store'), 'amazon');
  end if;
  if url is null then raise exception 'LINK_NOT_FOUND'; end if;
  insert into public.outbound_clicks (group_id, participant_id, wish_item_id, product_id, store, origin)
  values (gid, p_participant_id, p_wish_item_id, pid, store, left(p_origin, 40));
  return jsonb_build_object('url', url, 'store', store);
end $$;

-- Lembrete anônimo (in-app) / do organizador (registro).
-- O lembrete anônimo nunca sai do servidor: aparece para quem foi lembrado
-- quando essa pessoa abre o próprio link. Assim ninguém descobre quem tirou quem.
create or replace function public.rpc_nudge(p_code text, p_participant_id uuid, p_key text, p_kind text, p_to_participant_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
  last_at timestamptz;
begin
  perform public.assert_key(p_key);
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if p_kind = 'organizador' then
    if g.owner_key_hash <> public.key_hash(p_key) then raise exception 'NOT_OWNER'; end if;
    insert into public.nudges (group_id, from_participant_id, to_participant_id, kind)
    values (g.id, null, p_to_participant_id, 'organizador');
  else
    select * into me from public.participants where id = p_participant_id and group_id = g.id and removed_at is null;
    if not found or me.claim_key_hash <> public.key_hash(p_key) then raise exception 'NOT_YOURS'; end if;
    -- só pode lembrar quem eu tirei
    if not exists (select 1 from public.assignments a where a.group_id = g.id and a.giver_id = me.id and a.receiver_id = p_to_participant_id) then
      raise exception 'NOT_YOUR_FRIEND';
    end if;
    -- no máximo um lembrete a cada 12 horas
    select max(created_at) into last_at from public.nudges
      where from_participant_id = me.id and to_participant_id = p_to_participant_id and kind = 'anonimo';
    if last_at is not null and last_at > now() - interval '12 hours' then
      return jsonb_build_object('ok', true, 'already', true, 'last_at', last_at);
    end if;
    insert into public.nudges (group_id, from_participant_id, to_participant_id, kind)
    values (g.id, me.id, p_to_participant_id, 'anonimo');
  end if;
  return jsonb_build_object('ok', true, 'already', false, 'last_at', now());
end $$;

-- Analytics mínimo (spec §10). PostHog/Firebase entram depois, mesmo nome de evento.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  name text not null,
  props jsonb,
  group_id uuid,
  participant_id uuid,
  platform text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

insert into public.app_settings (key, value) values
  ('affiliate_tag_amazon', 'tirei-20'),
  ('search_url_amazon', 'https://www.amazon.com.br/s?k={q}&tag={tag}'),
  ('search_url_mercadolivre', 'https://lista.mercadolivre.com.br/{q}'),
  ('default_store', 'amazon'),
  ('public_base_url', 'https://amigoocultoja.com.br')
on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- RLS: tudo ligado, nada acessível direto (exceto products ativos)
-- ---------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.groups enable row level security;
alter table public.participants enable row level security;
alter table public.exclusions enable row level security;
alter table public.assignments enable row level security;
alter table public.products enable row level security;
alter table public.wish_items enable row level security;
alter table public.outbound_clicks enable row level security;
alter table public.nudges enable row level security;
alter table public.events enable row level security;
alter table public.app_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.products to anon, authenticated;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (active);

-- ---------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------
create or replace function public.key_hash(p_key text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(p_key, 'sha256'), 'hex')
$$;

create or replace function public.assert_key(p_key text)
returns void language plpgsql immutable as $$
begin
  if p_key is null or length(p_key) < 32 then
    raise exception 'INVALID_KEY';
  end if;
end $$;

create or replace function public.normalize_code(p_code text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public.setting(p_key text)
returns text language sql stable security definer set search_path = public as $$
  select value from public.app_settings where key = p_key
$$;

create or replace function public.build_search_url(p_query text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  store text := coalesce(public.setting('default_store'), 'amazon');
  tpl text;
begin
  tpl := public.setting('search_url_' || store);
  if tpl is null then
    tpl := 'https://www.amazon.com.br/s?k={q}&tag={tag}';
  end if;
  return replace(replace(tpl, '{q}', replace(coalesce(p_query, ''), ' ', '+')),
                 '{tag}', coalesce(public.setting('affiliate_tag_amazon'), ''));
end $$;

create or replace function public.item_json(w public.wish_items)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', w.id,
    'title', w.title,
    'product_id', w.product_id,
    'price_cents', w.price_cents,
    'store', w.store,
    'position', w.position,
    'is_search', w.product_id is null
  )
$$;

-- ---------------------------------------------------------------
-- RPCs públicas (quem tem o link)
-- ---------------------------------------------------------------

-- Tela 7: dados do grupo + nomes (quem já entrou aparece desabilitado)
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

-- Tela 7 → 8: vincular o nome ao aparelho (P0-07)
create or replace function public.rpc_claim(p_code text, p_participant_id uuid, p_key text)
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
  if p.claim_key_hash is not null and p.claim_key_hash <> h then
    raise exception 'ALREADY_CLAIMED';
  end if;
  if p.claim_key_hash is null then
    update public.participants set claim_key_hash = h, claimed_at = now() where id = p.id;
  end if;
  return jsonb_build_object('ok', true, 'participant_id', p.id, 'display_name', p.display_name);
end $$;

-- Tela 8: meu resultado + lista do amigo + minha lista. Marca revealed_at.
create or replace function public.rpc_my_result(p_code text, p_participant_id uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
  a public.assignments;
  friend public.participants;
begin
  perform public.assert_key(p_key);
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into me from public.participants
    where id = p_participant_id and group_id = g.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if me.claim_key_hash is null or me.claim_key_hash <> public.key_hash(p_key) then
    raise exception 'NOT_YOURS';
  end if;
  select * into a from public.assignments where group_id = g.id and giver_id = me.id;
  if not found then raise exception 'NOT_DRAWN'; end if;
  select * into friend from public.participants where id = a.receiver_id;
  if me.revealed_at is null then
    update public.participants set revealed_at = now() where id = me.id;
  end if;
  return jsonb_build_object(
    'group', jsonb_build_object(
      'id', g.id, 'code', g.code, 'name', g.name,
      'budget_cents', g.budget_cents, 'exchange_at', g.exchange_at
    ),
    'me', jsonb_build_object('id', me.id, 'display_name', me.display_name),
    'friend', jsonb_build_object(
      'id', friend.id,
      'display_name', friend.display_name,
      'items', coalesce((select jsonb_agg(public.item_json(w) order by w.position)
                         from public.wish_items w where w.participant_id = friend.id), '[]'::jsonb)
    ),
    'version', a.version,
    'my_items', coalesce((select jsonb_agg(public.item_json(w) order by w.position)
                          from public.wish_items w where w.participant_id = me.id), '[]'::jsonb),
    -- lembretes anônimos que recebi e ainda não atendi (só contam enquanto minha lista está vazia)
    'nudges_for_me', (select count(*) from public.nudges n
                      where n.to_participant_id = me.id and n.kind = 'anonimo'
                        and not exists (select 1 from public.wish_items w where w.participant_id = me.id)),
    -- quando foi meu último lembrete para quem eu tirei (para não repetir)
    'nudged_friend_at', (select max(n.created_at) from public.nudges n
                         where n.from_participant_id = me.id and n.to_participant_id = friend.id and n.kind = 'anonimo')
  );
end $$;

-- Tela 8: salvar minha lista (até 3). p_items: [{title, product_id?}]
create or replace function public.rpc_set_wish_items(p_code text, p_participant_id uuid, p_key text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_group public.groups%rowtype;
  v_me public.participants%rowtype;
  v_item jsonb;
  v_pos int := 0;
  v_pid uuid;
  v_prod_name text;
  v_prod_url text;
  v_prod_price int;
  v_prod_store text;
  v_title text;
begin
  perform public.assert_key(p_key);
  select * into v_group from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into v_me from public.participants where id = p_participant_id and group_id = v_group.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if v_me.claim_key_hash is null or v_me.claim_key_hash <> public.key_hash(p_key) then
    raise exception 'NOT_YOURS';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 3 then
    raise exception 'TOO_MANY_ITEMS';
  end if;

  -- substitui a lista inteira
  delete from public.wish_items where participant_id = v_me.id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_pid := null; v_prod_name := null; v_prod_url := null; v_prod_price := null; v_prod_store := null;
    if (v_item->>'product_id') is not null then
      select pr.id, pr.name, pr.affiliate_url, pr.price_cents, pr.store
        into v_pid, v_prod_name, v_prod_url, v_prod_price, v_prod_store
        from public.products pr where pr.id = (v_item->>'product_id')::uuid and pr.active;
    end if;
    v_title := left(btrim(coalesce(v_item->>'title', v_prod_name, '')), 120);
    if v_title = '' then continue; end if;
    v_pos := v_pos + 1;
    if v_pid is not null then
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position)
      values (v_me.id, v_prod_name, v_pid, v_prod_url, v_prod_price, v_prod_store, v_pos);
    else
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position)
      values (v_me.id, v_title, null, public.build_search_url(v_title), null, coalesce(public.setting('default_store'), 'amazon'), v_pos);
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce((select jsonb_agg(public.item_json(w) order by w.position) from public.wish_items w where w.participant_id = v_me.id), '[]'::jsonb)
  );
end
$fn$;

-- Tela 8/9: sugestões dentro do valor, vitrine varia por participante
create or replace function public.rpc_suggestions(p_code text, p_participant_id uuid default null, p_limit int default 6)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g public.groups;
  seed text := coalesce(p_participant_id::text, '');
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pr.id, 'name', pr.name, 'price_cents', pr.price_cents,
      'store', pr.store, 'image_url', pr.image_url, 'tags', pr.tags
    ) order by md5(pr.id::text || seed))
    from (
      select * from public.products pr
      where pr.active and (g.budget_cents is null or pr.price_cents <= g.budget_cents)
      order by md5(pr.id::text || seed)
      limit greatest(1, least(coalesce(p_limit, 6), 12))
    ) pr
  ), '[]'::jsonb);
end $$;

-- Redirecionador /r: registra o clique e devolve a URL de destino
create or replace function public.rpc_resolve_link(
  p_wish_item_id uuid default null,
  p_product_id uuid default null,
  p_query text default null,
  p_code text default null,
  p_participant_id uuid default null,
  p_origin text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  url text;
  store text;
  gid uuid;
  pid uuid;
begin
  if p_code is not null then
    select id into gid from public.groups where code = public.normalize_code(p_code);
  end if;
  if p_wish_item_id is not null then
    select w.affiliate_url, w.store, w.product_id into url, store, pid from public.wish_items w where w.id = p_wish_item_id;
  elsif p_product_id is not null then
    select pr.affiliate_url, pr.store into url, store from public.products pr where pr.id = p_product_id;
    pid := p_product_id;
  elsif p_query is not null then
    url := public.build_search_url(p_query);
    store := coalesce(public.setting('default_store'), 'amazon');
  end if;
  if url is null then raise exception 'LINK_NOT_FOUND'; end if;
  insert into public.outbound_clicks (group_id, participant_id, wish_item_id, product_id, store, origin)
  values (gid, p_participant_id, p_wish_item_id, pid, store, left(p_origin, 40));
  return jsonb_build_object('url', url, 'store', store);
end $$;

-- Lembrete anônimo / do organizador (registro)
create or replace function public.rpc_nudge(p_code text, p_participant_id uuid, p_key text, p_kind text, p_to_participant_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
begin
  perform public.assert_key(p_key);
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if p_kind = 'organizador' then
    if g.owner_key_hash <> public.key_hash(p_key) then raise exception 'NOT_OWNER'; end if;
    insert into public.nudges (group_id, from_participant_id, to_participant_id, kind)
    values (g.id, null, p_to_participant_id, 'organizador');
  else
    select * into me from public.participants where id = p_participant_id and group_id = g.id and removed_at is null;
    if not found or me.claim_key_hash <> public.key_hash(p_key) then raise exception 'NOT_YOURS'; end if;
    insert into public.nudges (group_id, from_participant_id, to_participant_id, kind)
    values (g.id, me.id, p_to_participant_id, 'anonimo');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Analytics
create or replace function public.rpc_track(p_name text, p_props jsonb default null, p_code text default null, p_participant_id uuid default null, p_platform text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
begin
  if p_name is null or length(p_name) > 60 then return; end if;
  if p_code is not null then
    select id into gid from public.groups where code = public.normalize_code(p_code);
  end if;
  insert into public.events (name, props, group_id, participant_id, platform)
  values (p_name, case when length(coalesce(p_props::text, '')) > 2000 then null else p_props end, gid, p_participant_id, left(p_platform, 20));
end $$;

-- ---------------------------------------------------------------
-- RPCs do organizador (chave do aparelho que criou o grupo)
-- ---------------------------------------------------------------

-- Tela 6: status por pessoa, sem nenhuma relação com quem tirou quem
create or replace function public.rpc_panel(p_code text, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g public.groups;
begin
  perform public.assert_key(p_key);
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if g.owner_key_hash <> public.key_hash(p_key) then raise exception 'NOT_OWNER'; end if;
  return jsonb_build_object(
    'group', jsonb_build_object(
      'id', g.id, 'code', g.code, 'name', g.name, 'budget_cents', g.budget_cents,
      'exchange_at', g.exchange_at, 'single_cycle', g.single_cycle, 'status', g.status,
      'created_at', g.created_at,
      'max_version', coalesce((select max(version) from public.assignments where group_id = g.id), 1)
    ),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'is_organizer', p.is_organizer,
        'status', case
          when p.claim_key_hash is null then 'not_opened'
          when p.revealed_at is null then 'entered'
          when exists (select 1 from public.wish_items w where w.participant_id = p.id) then 'list_ready'
          else 'viewed' end,
        'items_count', (select count(*) from public.wish_items w where w.participant_id = p.id)
      ) order by p.is_organizer desc, lower(p.display_name))
      from public.participants p where p.group_id = g.id and p.removed_at is null
    ), '[]'::jsonb),
    'exclusions', coalesce((
      select jsonb_agg(jsonb_build_array(e.a, e.b)) from public.exclusions e where e.group_id = g.id
    ), '[]'::jsonb)
  );
end $$;

-- Tela 6: liberar um nome (desvincula o aparelho)
create or replace function public.rpc_release(p_code text, p_key text, p_participant_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
begin
  perform public.assert_key(p_key);
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if g.owner_key_hash <> public.key_hash(p_key) then raise exception 'NOT_OWNER'; end if;
  update public.participants
    set claim_key_hash = null, claimed_at = null, revealed_at = null, user_id = null
    where id = p_participant_id and group_id = g.id;
  return jsonb_build_object('ok', true);
end $$;

-- Início: grupos que este aparelho organiza
create or replace function public.rpc_my_groups(p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_key(p_key);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', g.code, 'name', g.name, 'budget_cents', g.budget_cents, 'exchange_at', g.exchange_at,
      'created_at', g.created_at,
      'total', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null),
      'viewed', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null and p.revealed_at is not null),
      'organizer_participant_id', (select p.id from public.participants p where p.group_id = g.id and p.is_organizer limit 1)
    ) order by g.created_at desc)
    from public.groups g where g.owner_key_hash = public.key_hash(p_key)
  ), '[]'::jsonb);
end $$;

-- Permissões de execução
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.rpc_get_group(text),
  public.rpc_claim(text, uuid, text),
  public.rpc_my_result(text, uuid, text),
  public.rpc_set_wish_items(text, uuid, text, jsonb),
  public.rpc_suggestions(text, uuid, int),
  public.rpc_resolve_link(uuid, uuid, text, text, uuid, text),
  public.rpc_nudge(text, uuid, text, text, uuid),
  public.rpc_track(text, jsonb, text, uuid, text),
  public.rpc_panel(text, text),
  public.rpc_release(text, text, uuid),
  public.rpc_my_groups(text)
to anon, authenticated;

-- ---------------------------------------------------------------
-- Catálogo curado inicial (placeholder; a tag de afiliado vem de app_settings)
-- ---------------------------------------------------------------
insert into public.products (name, price_cents, store, affiliate_url, tags) values
  -- até R$ 50
  ('Caneca térmica 500 ml', 4490, 'amazon', 'https://www.amazon.com.br/s?k=caneca+termica+500ml&tag=tirei-20', array['casa','cafe']),
  ('Livro mais vendido do mês', 4500, 'amazon', 'https://www.amazon.com.br/s?k=livro+mais+vendido&tag=tirei-20', array['livros']),
  ('Jogo de cartas Uno', 2990, 'amazon', 'https://www.amazon.com.br/s?k=uno+jogo+de+cartas&tag=tirei-20', array['jogos']),
  ('Meia divertida (kit 3 pares)', 3990, 'mercadolivre', 'https://lista.mercadolivre.com.br/kit-meias-divertidas', array['moda']),
  ('Vela aromática', 4290, 'amazon', 'https://www.amazon.com.br/s?k=vela+aromatica&tag=tirei-20', array['casa']),
  ('Garrafa de água 1 L', 4990, 'amazon', 'https://www.amazon.com.br/s?k=garrafa+agua+1l&tag=tirei-20', array['esporte']),
  ('Kit chocolate gourmet', 4590, 'mercadolivre', 'https://lista.mercadolivre.com.br/kit-chocolate-gourmet', array['comida']),
  ('Planner 2027', 3890, 'amazon', 'https://www.amazon.com.br/s?k=planner+2027&tag=tirei-20', array['papelaria']),
  -- até R$ 100
  ('Perfume amadeirado 100 ml', 8900, 'amazon', 'https://www.amazon.com.br/s?k=perfume+amadeirado+100ml&tag=tirei-20', array['beleza']),
  ('Vinho tinto chileno', 6900, 'mercadolivre', 'https://lista.mercadolivre.com.br/vinho-tinto-chileno', array['bebida']),
  ('Fone bluetooth', 9900, 'amazon', 'https://www.amazon.com.br/s?k=fone+bluetooth&tag=tirei-20', array['tech']),
  ('Kit de churrasco', 9490, 'amazon', 'https://www.amazon.com.br/s?k=kit+churrasco&tag=tirei-20', array['casa']),
  ('Caixa de som portátil', 9900, 'mercadolivre', 'https://lista.mercadolivre.com.br/caixa-de-som-portatil', array['tech']),
  ('Jogo de tabuleiro', 8990, 'amazon', 'https://www.amazon.com.br/s?k=jogo+de+tabuleiro&tag=tirei-20', array['jogos']),
  ('Vale-presente', 10000, 'amazon', 'https://www.amazon.com.br/s?k=vale+presente&tag=tirei-20', array['vale']),
  ('Kit skincare', 7900, 'amazon', 'https://www.amazon.com.br/s?k=kit+skincare&tag=tirei-20', array['beleza']),
  -- até R$ 200
  ('Smartwatch', 19900, 'amazon', 'https://www.amazon.com.br/s?k=smartwatch&tag=tirei-20', array['tech']),
  ('Cafeteira italiana + café especial', 15900, 'mercadolivre', 'https://lista.mercadolivre.com.br/cafeteira-italiana', array['cafe']),
  ('Mochila para notebook', 17900, 'amazon', 'https://www.amazon.com.br/s?k=mochila+notebook&tag=tirei-20', array['moda']),
  ('Kit de vinhos (2 garrafas)', 14900, 'mercadolivre', 'https://lista.mercadolivre.com.br/kit-vinhos', array['bebida']),
  ('Echo Dot', 19900, 'amazon', 'https://www.amazon.com.br/s?k=echo+dot&tag=tirei-20', array['tech']),
  ('Tênis casual', 18900, 'amazon', 'https://www.amazon.com.br/s?k=tenis+casual&tag=tirei-20', array['moda']),
  ('Kit massagem e spa em casa', 12900, 'amazon', 'https://www.amazon.com.br/s?k=kit+spa+massagem&tag=tirei-20', array['bem-estar']),
  ('Livro ilustrado de culinária', 11900, 'amazon', 'https://www.amazon.com.br/s?k=livro+culinaria+ilustrado&tag=tirei-20', array['livros'])
on conflict do nothing;
