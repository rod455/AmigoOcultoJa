-- Fluxo completo como anon (papel do app no navegador). Termina com
-- "E2E PASSED" via exceção P0099, o que também desfaz os dados de teste.
do $$
declare
  k_org text := 'orgkey_0123456789abcdef0123456789abcdef';
  k_ana text := 'anakey_0123456789abcdef0123456789abcdef';
  k_bob text := 'bobkey_0123456789abcdef0123456789abcdef';
  gid uuid; p_org uuid; p_ana uuid; p_bru uuid; p_car uuid;
  r jsonb; prod uuid; wid uuid; log text := '';
begin
  insert into public.groups (code, name, owner_key_hash, budget_cents, exchange_at) values ('TEST01', 'Teste RLS', public.key_hash(k_org), 10000, '2026-12-24') returning id into gid;
  insert into public.participants (group_id, display_name, is_organizer, claim_key_hash, claimed_at) values (gid, 'Org Pessoa', true, public.key_hash(k_org), now()) returning id into p_org;
  insert into public.participants (group_id, display_name) values (gid, 'Ana Souza') returning id into p_ana;
  insert into public.participants (group_id, display_name) values (gid, 'Bruno Lima') returning id into p_bru;
  insert into public.participants (group_id, display_name) values (gid, 'Carla Mendes') returning id into p_car;
  insert into public.assignments (group_id, giver_id, receiver_id) values (gid, p_org, p_ana), (gid, p_ana, p_bru), (gid, p_bru, p_car), (gid, p_car, p_org);
  select id into prod from public.products where active order by price_cents limit 1;

  set local role anon;

  r := public.rpc_get_group('test01');
  if (r->>'name') <> 'Teste RLS' or jsonb_array_length(r->'participants') <> 4 then raise exception 'get_group falhou: %', r; end if;
  log := log || '1.get_group ok; ';

  r := public.rpc_claim('TEST01', p_ana, k_ana);
  begin
    r := public.rpc_claim('TEST01', p_ana, k_bob);
    raise exception 'claim duplicado deveria falhar';
  exception when others then
    if sqlerrm <> 'ALREADY_CLAIMED' then raise; end if;
  end;
  log := log || '2.claim+lock ok; ';

  r := public.rpc_my_result('TEST01', p_ana, k_ana);
  if (r->'friend'->>'id')::uuid <> p_bru then raise exception 'resultado errado: %', r; end if;
  log := log || '3.my_result ok; ';

  begin
    r := public.rpc_my_result('TEST01', p_ana, k_bob);
    raise exception 'leitura alheia deveria falhar';
  exception when others then
    if sqlerrm <> 'NOT_YOURS' then raise; end if;
  end;
  begin
    r := public.rpc_my_result('TEST01', p_ana, k_org);
    raise exception 'organizador leu resultado alheio';
  exception when others then
    if sqlerrm <> 'NOT_YOURS' then raise; end if;
  end;
  log := log || '4.segredo ok; ';

  r := public.rpc_set_wish_items('TEST01', p_ana, k_ana, jsonb_build_array(jsonb_build_object('product_id', prod), jsonb_build_object('title', 'Livro de ficção')));
  if jsonb_array_length(r->'items') <> 2 then raise exception 'set_wish_items: %', r; end if;
  if (r->'items'->1->>'is_search')::boolean is not true then raise exception 'texto livre deveria ser busca'; end if;
  r := public.rpc_set_wish_items('TEST01', p_ana, k_ana, jsonb_build_array(jsonb_build_object('title', 'Só um')));
  if jsonb_array_length(r->'items') <> 1 then raise exception 'substituição da lista falhou: %', r; end if;
  wid := (r->'items'->0->>'id')::uuid;
  log := log || '5.wish_items ok; ';

  r := public.rpc_my_result('TEST01', p_org, k_org);
  if jsonb_array_length(r->'friend'->'items') <> 1 then raise exception 'lista do amigo não apareceu: %', r; end if;
  log := log || '6.lista do amigo ok; ';

  r := public.rpc_panel('TEST01', k_org);
  if r::text like '%receiver%' or r::text like '%giver%' then raise exception 'painel vazou atribuições'; end if;
  if (select count(*) from jsonb_array_elements(r->'participants') e where e->>'status' = 'list_ready') <> 1 then raise exception 'status errado: %', r; end if;
  begin
    r := public.rpc_panel('TEST01', k_ana);
    raise exception 'painel aberto por não-organizador';
  exception when others then
    if sqlerrm <> 'NOT_OWNER' then raise; end if;
  end;
  log := log || '7.painel ok; ';

  r := public.rpc_suggestions('TEST01', p_ana, 6);
  if (select bool_or((e->>'price_cents')::int > 10000) from jsonb_array_elements(r) e) then raise exception 'sugestão acima do valor'; end if;
  if jsonb_array_length(r) <> 6 then raise exception 'esperava 6 sugestões: %', jsonb_array_length(r); end if;
  log := log || '8.sugestoes ok; ';

  r := public.rpc_resolve_link(wid, null, null, 'TEST01', p_org, 'lista_amigo');
  if (r->>'url') not like 'https://www.amazon.com.br/s?k=S%tag=tirei-20' then raise exception 'resolve_link: %', r; end if;
  log := log || '9.redirect ok; ';

  r := public.rpc_release('TEST01', k_org, p_ana);
  r := public.rpc_claim('TEST01', p_ana, k_bob);
  log := log || '10.release+reclaim ok; ';

  r := public.rpc_my_groups(k_org);
  if jsonb_array_length(r) <> 1 then raise exception 'my_groups: %', r; end if;
  log := log || '11.my_groups ok';

  reset role;
  raise exception 'E2E PASSED: %', log using errcode = 'P0099';
end $$;
