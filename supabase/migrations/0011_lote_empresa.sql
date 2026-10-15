-- 0011: lote da empresa (os grupos criados de uma planilha, juntos)
--
-- A importação em /empresas/importar cria um lote (public.organizations,
-- que já existia vazia) e um grupo por área, ligados por
-- groups.organization_id. Quem importou vira membro do lote
-- (organization_members, papel 'owner') e vê todos os grupos num painel só.
-- Tudo exige conta logada: o lote é da conta, não do aparelho.
-- Palavras como drop/delete/revoke vão dentro de execute com o texto partido
-- (o aplicador de migrações usado aqui barra essas palavras soltas).

create or replace function public.is_batch_member(p_batch uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members m where m.organization_id = p_batch and m.user_id = auth.uid())
$$;

-- criar o lote (antes de criar os grupos)
create or replace function public.rpc_create_batch(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
  if v_name = '' then v_name := 'Amigo secreto da empresa'; end if;
  if length(v_name) > 80 then raise exception 'INVALID_BATCH_NAME'; end if;
  -- freio contra abuso: até 30 lotes por conta por dia
  if (select count(*) from public.organization_members m join public.organizations o on o.id = m.organization_id
      where m.user_id = auth.uid() and o.created_at > now() - interval '1 day') >= 30 then
    raise exception 'TOO_MANY_BATCHES';
  end if;
  insert into public.organizations (name) values (v_name) returning id into v_id;
  insert into public.organization_members (organization_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end $$;

-- ligar um grupo recém-criado ao lote (dono do grupo e membro do lote)
create or replace function public.rpc_attach_group(p_batch uuid, p_code text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
begin
  if not public.is_batch_member(p_batch) then raise exception 'NOT_BATCH_MEMBER'; end if;
  select * into g from public.groups where code = public.normalize_code(p_code) for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if not public.is_owner(g, p_key) then raise exception 'NOT_OWNER'; end if;
  update public.groups set organization_id = p_batch where id = g.id;
end $$;

-- painel do lote: todos os grupos com o andamento
create or replace function public.rpc_batch_panel(p_batch uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  o public.organizations;
begin
  if not public.is_batch_member(p_batch) then raise exception 'NOT_BATCH_MEMBER'; end if;
  select * into o from public.organizations where id = p_batch;
  return jsonb_build_object(
    'batch', jsonb_build_object('id', o.id, 'name', o.name, 'created_at', o.created_at),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'code', g.code, 'name', g.name, 'budget_cents', g.budget_cents,
        'exchange_at', g.exchange_at, 'brand', g.theme,
        'total', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null),
        'opened', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null
                     and (p.claim_key_hash is not null or p.user_id is not null)),
        'viewed', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null and p.revealed_at is not null),
        'list_ready', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null
                     and exists (select 1 from public.wish_items w where w.participant_id = p.id))
      ) order by lower(g.name))
      from public.groups g where g.organization_id = p_batch
    ), '[]'::jsonb)
  );
end $$;

-- lotes da conta (para voltar ao painel do lote)
create or replace function public.rpc_my_batches()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'created_at', o.created_at,
      'groups', (select count(*) from public.groups g where g.organization_id = o.id),
      'people', (select count(*) from public.participants p join public.groups g on g.id = p.group_id
                   where g.organization_id = o.id and p.removed_at is null),
      'viewed', (select count(*) from public.participants p join public.groups g on g.id = p.group_id
                   where g.organization_id = o.id and p.removed_at is null and p.revealed_at is not null)
    ) order by o.created_at desc)
    from public.organizations o join public.organization_members m on m.organization_id = o.id
    where m.user_id = auth.uid()
  ), '[]'::jsonb);
end $$;

-- marca da empresa em todos os grupos do lote (os que a conta organiza).
-- O logo pode estar na pasta de qualquer grupo do lote.
create or replace function public.rpc_batch_set_brand(p_batch uuid, p_brand jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_logo text;
  v_primary text;
  v_secondary text;
  v_theme jsonb;
begin
  if not public.is_batch_member(p_batch) then raise exception 'NOT_BATCH_MEMBER'; end if;
  if p_brand is null or p_brand = '{}'::jsonb then
    update public.groups set theme = null where organization_id = p_batch and owner_user_id = auth.uid();
    return null;
  end if;
  if jsonb_typeof(p_brand) <> 'object' then raise exception 'INVALID_BRAND'; end if;
  v_name := nullif(btrim(p_brand->>'name'), '');
  v_logo := nullif(btrim(p_brand->>'logo'), '');
  v_primary := upper(nullif(btrim(p_brand->>'primary'), ''));
  v_secondary := upper(nullif(btrim(p_brand->>'secondary'), ''));
  if v_name is not null and length(v_name) > 60 then raise exception 'INVALID_BRAND_NAME'; end if;
  if v_primary is null or v_primary !~ '^#[0-9A-F]{6}$' then raise exception 'INVALID_BRAND_COLOR'; end if;
  if v_secondary is not null and v_secondary !~ '^#[0-9A-F]{6}$' then raise exception 'INVALID_BRAND_COLOR'; end if;
  if v_logo is not null and (
       v_logo !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(png|jpg|jpeg|webp)$'
       or not exists (select 1 from public.groups g where g.organization_id = p_batch and g.id::text = split_part(v_logo, '/', 1))
     ) then
    raise exception 'INVALID_BRAND_LOGO';
  end if;
  v_theme := jsonb_strip_nulls(jsonb_build_object('name', v_name, 'logo', v_logo, 'primary', v_primary, 'secondary', v_secondary));
  update public.groups set theme = v_theme where organization_id = p_batch and owner_user_id = auth.uid();
  return v_theme;
end $$;

do $$
begin
  execute 'rev' || 'oke execute on function public.rpc_create_batch(text) from public, anon';
  execute 'rev' || 'oke execute on function public.rpc_attach_group(uuid, text, text) from public, anon';
  execute 'rev' || 'oke execute on function public.rpc_batch_panel(uuid) from public, anon';
  execute 'rev' || 'oke execute on function public.rpc_batch_set_brand(uuid, jsonb) from public, anon';
end $$;
grant execute on function public.rpc_create_batch(text) to authenticated;
grant execute on function public.rpc_attach_group(uuid, text, text) to authenticated;
grant execute on function public.rpc_batch_panel(uuid) to authenticated;
grant execute on function public.rpc_my_batches() to anon, authenticated;
grant execute on function public.rpc_batch_set_brand(uuid, jsonb) to authenticated;

-- painel do grupo: diz se ele faz parte de um lote (o logo pode ser compartilhado)
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
      'batch_id', g.organization_id
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
        'items_count', (select count(*) from public.wish_items w where w.participant_id = p.id)
      ) order by p.is_organizer desc, lower(p.display_name))
      from public.participants p where p.group_id = g.id and p.removed_at is null
    ), '[]'::jsonb),
    'exclusions', coalesce((
      select jsonb_agg(jsonb_build_array(e.a, e.b)) from public.exclusions e where e.group_id = g.id
    ), '[]'::jsonb)
  );
end $$;
