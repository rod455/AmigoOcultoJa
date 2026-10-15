-- 0015: entrega para quem está longe e "recebi meu presente"
--
-- * public.deliveries: uma linha por participante. address = onde a pessoa
--   quer receber (opcional, até 300 letras); received_at = quando marcou
--   que recebeu. Sem acesso direto (RLS sem políticas): só pelas RPCs.
-- * O endereço só aparece para quem tirou a pessoa (rpc_my_result → friend),
--   nunca para quem organiza nem para o grupo. 30 dias depois da data da
--   troca, o endereço é apagado na próxima leitura do grupo (sem data de
--   troca: 60 dias depois de informado).
-- * rpc_panel e rpc_batch_panel contam quem já recebeu.
-- Palavras como drop/delete/revoke vão dentro de execute com o texto partido
-- (o aplicador de migrações usado aqui barra essas palavras soltas).

do $$
begin
  execute 'create table if not exists public.deliveries (
    participant_id uuid primary key references public.participants on de' || 'lete cascade,
    address text check (address is null or length(address) <= 300),
    address_at timestamptz,
    received_at timestamptz,
    updated_at timestamptz not null default now()
  )';
end $$;
alter table public.deliveries enable row level security;

-- endereço vencido vira null (chamado pelas leituras do grupo)
create or replace function public.expire_delivery_addresses(p_group uuid)
returns void language sql security definer set search_path = public as $$
  update public.deliveries d set address = null, address_at = null, updated_at = now()
  from public.participants p join public.groups g on g.id = p.group_id
  where d.participant_id = p.id and p.group_id = p_group and d.address is not null
    and ((g.exchange_at is not null and now() > g.exchange_at + interval '30 days')
      or (g.exchange_at is null and d.address_at < now() - interval '60 days'))
$$;

create or replace function public.rpc_set_delivery(p_code text, p_participant_id uuid, p_key text, p_address text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
  v text := nullif(btrim(regexp_replace(coalesce(p_address, ''), '\s+', ' ', 'g')), '');
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into me from public.participants where id = p_participant_id and group_id = g.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if not public.is_mine(me, p_key) then raise exception 'NOT_YOURS'; end if;
  if v is not null and length(v) > 300 then raise exception 'ADDRESS_TOO_LONG'; end if;
  insert into public.deliveries (participant_id, address, address_at, updated_at)
    values (me.id, v, case when v is null then null else now() end, now())
  on conflict (participant_id) do update set address = excluded.address, address_at = excluded.address_at, updated_at = now();
  return jsonb_build_object('address', v);
end $$;

create or replace function public.rpc_set_received(p_code text, p_participant_id uuid, p_key text, p_received boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
  v timestamptz := case when coalesce(p_received, false) then now() else null end;
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into me from public.participants where id = p_participant_id and group_id = g.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if not public.is_mine(me, p_key) then raise exception 'NOT_YOURS'; end if;
  insert into public.deliveries (participant_id, received_at, updated_at) values (me.id, v, now())
  on conflict (participant_id) do update set received_at = excluded.received_at, updated_at = now();
  return jsonb_build_object('received_at', v);
end $$;

grant execute on function public.rpc_set_delivery(text, uuid, text, text) to anon, authenticated;
grant execute on function public.rpc_set_received(text, uuid, text, boolean) to anon, authenticated;

-- resultado da pessoa: o meu endereço e recebimento; do amigo, o endereço (só para mim, que o tirei)
create or replace function public.rpc_my_result(p_code text, p_participant_id uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
  a public.assignments;
  friend public.participants;
  my_d public.deliveries;
  fr_d public.deliveries;
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into me from public.participants
    where id = p_participant_id and group_id = g.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if not public.is_mine(me, p_key) then raise exception 'NOT_YOURS'; end if;
  select * into a from public.assignments where group_id = g.id and giver_id = me.id;
  if not found then raise exception 'NOT_DRAWN'; end if;
  select * into friend from public.participants where id = a.receiver_id;
  if me.revealed_at is null then
    update public.participants set revealed_at = now() where id = me.id;
  end if;
  perform public.expire_delivery_addresses(g.id);
  select * into my_d from public.deliveries where participant_id = me.id;
  select * into fr_d from public.deliveries where participant_id = friend.id;
  return jsonb_build_object(
    'group', jsonb_build_object(
      'id', g.id, 'code', g.code, 'name', g.name,
      'budget_cents', g.budget_cents, 'exchange_at', g.exchange_at
    ),
    'me', jsonb_build_object('id', me.id, 'display_name', me.display_name,
      'delivery_address', my_d.address, 'received_at', my_d.received_at),
    'friend', jsonb_build_object(
      'id', friend.id,
      'display_name', friend.display_name,
      'delivery_address', fr_d.address,
      'received_at', fr_d.received_at,
      'items', coalesce((select jsonb_agg(public.item_json(w) order by w.position)
                         from public.wish_items w where w.participant_id = friend.id), '[]'::jsonb)
    ),
    'version', a.version,
    'my_items', coalesce((select jsonb_agg(public.item_json(w) order by w.position)
                          from public.wish_items w where w.participant_id = me.id), '[]'::jsonb),
    'nudges_for_me', (select count(*) from public.nudges n
                      where n.to_participant_id = me.id and n.kind = 'anonimo'
                        and not exists (select 1 from public.wish_items w where w.participant_id = me.id)),
    'nudged_friend_at', (select max(n.created_at) from public.nudges n
                         where n.from_participant_id = me.id and n.to_participant_id = friend.id and n.kind = 'anonimo')
  );
end $$;

-- painel do grupo: quem já recebeu o presente (o endereço nunca vai para quem organiza)
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
        'invite_token', p.invite_token,
        'received', exists (select 1 from public.deliveries d where d.participant_id = p.id and d.received_at is not null)
      ) order by p.is_organizer desc, lower(p.display_name))
      from public.participants p where p.group_id = g.id and p.removed_at is null
    ), '[]'::jsonb),
    'exclusions', coalesce((
      select jsonb_agg(jsonb_build_array(e.a, e.b)) from public.exclusions e where e.group_id = g.id
    ), '[]'::jsonb)
  );
end $$;

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
                     and exists (select 1 from public.wish_items w where w.participant_id = p.id)),
        'received', (select count(*) from public.participants p join public.deliveries d on d.participant_id = p.id
                     where p.group_id = g.id and p.removed_at is null and d.received_at is not null)
      ) order by lower(g.name))
      from public.groups g where g.organization_id = p_batch
    ), '[]'::jsonb)
  );
end $$;
