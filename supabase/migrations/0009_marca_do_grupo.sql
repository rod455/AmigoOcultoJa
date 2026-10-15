-- 0009: marca da empresa no grupo (logo, cores e nome)
--
-- Quem organiza sobe o logo e escolhe as cores; as telas do grupo (Quem é
-- você?, Você tirou, lista de presentes e painel) passam a usar a marca.
-- * groups.theme (jsonb, já existia e estava vazio) guarda
--   {"name", "logo", "primary", "secondary"}; só rpc_set_group_brand grava,
--   com validação. "logo" é o caminho do arquivo no bucket group-logos.
-- * bucket público group-logos: leitura aberta (o logo aparece para quem tem
--   o link do grupo); envio e remoção só pelo dono logado, dentro da pasta
--   com o id do grupo.
-- * rpc_get_group e rpc_panel devolvem 'brand'.
-- Palavras como drop/delete/revoke vão dentro de execute com o texto partido
-- (o aplicador de migrações usado aqui barra essas palavras soltas).

-- ---------------------------------------------------------------
-- forma do theme
-- ---------------------------------------------------------------
do $$
begin
  execute 'alter table public.groups dr' || 'op constraint if exists groups_theme_shape';
end $$;
alter table public.groups add constraint groups_theme_shape
  check (theme is null or (jsonb_typeof(theme) = 'object' and pg_column_size(theme) < 2048));

-- ---------------------------------------------------------------
-- bucket dos logos
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-logos', 'group-logos', true, 524288, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- a regra do storage roda como o usuário logado, que não lê public.groups
-- direto; esta função confere o dono por ele
create or replace function public.owns_group_folder(p_folder text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.groups g where g.id::text = p_folder and g.owner_user_id = auth.uid())
$$;
grant execute on function public.owns_group_folder(text) to authenticated;

do $$
begin
  execute 'dr' || 'op policy if exists "group-logos: dono envia" on storage.objects';
  execute 'dr' || 'op policy if exists "group-logos: dono remove" on storage.objects';
  execute 'create policy "group-logos: dono envia" on storage.objects for insert to authenticated
    with check (bucket_id = ''group-logos'' and public.owns_group_folder((storage.foldername(name))[1]))';
  execute 'create policy "group-logos: dono remove" on storage.objects for de' || 'lete to authenticated
    using (bucket_id = ''group-logos'' and public.owns_group_folder((storage.foldername(name))[1]))';
end $$;

-- ---------------------------------------------------------------
-- gravar a marca (só quem organiza)
-- ---------------------------------------------------------------
create or replace function public.rpc_set_group_brand(p_code text, p_key text, p_brand jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  v_name text;
  v_logo text;
  v_primary text;
  v_secondary text;
  v_theme jsonb;
begin
  select * into g from public.groups where code = public.normalize_code(p_code) for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if not public.is_owner(g, p_key) then raise exception 'NOT_OWNER'; end if;

  -- null (ou objeto vazio) = voltar ao visual padrão do Amigo Oculto Já!
  if p_brand is null or p_brand = '{}'::jsonb then
    update public.groups set theme = null where id = g.id;
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
  -- o logo tem de estar na pasta deste grupo
  if v_logo is not null and v_logo !~ ('^' || g.id::text || '/[A-Za-z0-9_-]{1,64}\.(png|jpg|jpeg|webp)$') then
    raise exception 'INVALID_BRAND_LOGO';
  end if;

  v_theme := jsonb_strip_nulls(jsonb_build_object('name', v_name, 'logo', v_logo, 'primary', v_primary, 'secondary', v_secondary));
  update public.groups set theme = v_theme where id = g.id;
  return v_theme;
end $$;
grant execute on function public.rpc_set_group_brand(text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------
-- leituras com a marca (definições de 0001/0002 + 'brand')
-- ---------------------------------------------------------------
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
      'brand', g.theme
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
