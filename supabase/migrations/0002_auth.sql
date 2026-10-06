-- Conta do organizador (Supabase Auth: Google, Apple, e-mail+senha).
-- O organizador passa a ser identificado pela chave do aparelho OU pela conta
-- (auth.uid()). Os participantes continuam sem conta. Nenhuma função devolve
-- quem tirou quem para ninguém além do próprio participante.

create or replace function public.is_owner(g public.groups, p_key text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce(p_key is not null and length(p_key) >= 32 and g.owner_key_hash = public.key_hash(p_key), false)
      or coalesce(auth.uid() is not null and g.owner_user_id = auth.uid(), false)
$$;

create or replace function public.is_mine(p public.participants, p_key text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce(p_key is not null and length(p_key) >= 32 and p.claim_key_hash = public.key_hash(p_key), false)
      or coalesce(auth.uid() is not null and p.user_id = auth.uid(), false)
$$;

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
      'max_version', coalesce((select max(version) from public.assignments where group_id = g.id), 1)
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

create or replace function public.rpc_release(p_code text, p_key text, p_participant_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
begin
  select * into g from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if not public.is_owner(g, p_key) then raise exception 'NOT_OWNER'; end if;
  update public.participants
    set claim_key_hash = null, claimed_at = null, revealed_at = null, user_id = null
    where id = p_participant_id and group_id = g.id and not is_organizer;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_my_groups(p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', g.code, 'name', g.name, 'budget_cents', g.budget_cents, 'exchange_at', g.exchange_at,
      'created_at', g.created_at,
      'total', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null),
      'viewed', (select count(*) from public.participants p where p.group_id = g.id and p.removed_at is null and p.revealed_at is not null),
      'organizer_participant_id', (select p.id from public.participants p where p.group_id = g.id and p.is_organizer limit 1)
    ) order by g.created_at desc)
    from public.groups g where public.is_owner(g, p_key)
  ), '[]'::jsonb);
end $$;

create or replace function public.rpc_my_result(p_code text, p_participant_id uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  me public.participants;
  a public.assignments;
  friend public.participants;
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
    'nudges_for_me', (select count(*) from public.nudges n
                      where n.to_participant_id = me.id and n.kind = 'anonimo'
                        and not exists (select 1 from public.wish_items w where w.participant_id = me.id)),
    'nudged_friend_at', (select max(n.created_at) from public.nudges n
                         where n.from_participant_id = me.id and n.to_participant_id = friend.id and n.kind = 'anonimo')
  );
end $$;

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
  if p.claim_key_hash is not null and p.claim_key_hash <> h and not public.is_mine(p, null) then
    raise exception 'ALREADY_CLAIMED';
  end if;
  if p.claim_key_hash is null or public.is_mine(p, null) then
    update public.participants set claim_key_hash = h, claimed_at = coalesce(claimed_at, now()),
      user_id = coalesce(user_id, auth.uid()) where id = p.id;
  end if;
  return jsonb_build_object('ok', true, 'participant_id', p.id, 'display_name', p.display_name);
end $$;
