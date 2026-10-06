-- Organizador logado (auth.uid()) em outro aparelho acessa painel/grupos; outro usuário não;
-- ninguém lê resultado alheio. Cria 2 usuários de teste e desfaz tudo no fim (P0099).
do $$
declare
  k_org text := 'orgkey_0123456789abcdef0123456789abcdef';
  k_other text := 'otherkey_0123456789abcdef0123456789abcdef';
  k_a text := 'aaakey_0123456789abcdef0123456789abcdef';
  uid uuid := gen_random_uuid();
  uid2 uuid := gen_random_uuid();
  gid uuid; p_org uuid; p_a uuid; p_b uuid; r jsonb; log text := '';
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste-a@tirei.test', '', now(), '{"provider":"email"}', '{"full_name":"Teste A"}', now(), now()),
         (uid2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste-b@tirei.test', '', now(), '{"provider":"email"}', '{"full_name":"Teste B"}', now(), now());
  insert into public.groups (code, name, owner_key_hash, owner_user_id) values ('TESTA1', 'Auth', public.key_hash(k_org), uid) returning id into gid;
  insert into public.participants (group_id, display_name, is_organizer, claim_key_hash, user_id, claimed_at) values (gid, 'Org', true, public.key_hash(k_org), uid, now()) returning id into p_org;
  insert into public.participants (group_id, display_name) values (gid, 'A') returning id into p_a;
  insert into public.participants (group_id, display_name) values (gid, 'B') returning id into p_b;
  insert into public.assignments (group_id, giver_id, receiver_id) values (gid, p_org, p_a), (gid, p_a, p_b), (gid, p_b, p_org);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  r := public.rpc_panel('TESTA1', k_other);
  if (r->'group'->>'code') <> 'TESTA1' then raise exception 'painel via conta falhou'; end if;
  r := public.rpc_my_groups(k_other);
  if jsonb_array_length(r) <> 1 then raise exception 'my_groups via conta falhou: %', r; end if;
  r := public.rpc_my_result('TESTA1', p_org, k_other);
  if (r->'friend'->>'display_name') <> 'A' then raise exception 'my_result via conta falhou'; end if;
  log := log || '1.conta-em-outro-aparelho ok; ';
  begin
    r := public.rpc_my_result('TESTA1', p_a, k_other);
    raise exception 'conta leu resultado alheio';
  exception when others then if sqlerrm <> 'NOT_YOURS' then raise; end if; end;
  begin
    r := public.rpc_my_result('TESTA1', p_a, k_a);
    raise exception 'resultado de nome não assumido foi lido';
  exception when others then if sqlerrm <> 'NOT_YOURS' then raise; end if; end;
  log := log || '2.segredo-mantido ok; ';

  perform set_config('request.jwt.claims', json_build_object('sub', uid2, 'role', 'authenticated')::text, true);
  begin
    r := public.rpc_panel('TESTA1', k_other);
    raise exception 'outro usuário abriu o painel';
  exception when others then if sqlerrm <> 'NOT_OWNER' then raise; end if; end;
  r := public.rpc_my_groups(k_other);
  if jsonb_array_length(r) <> 0 then raise exception 'outro usuário viu grupos alheios'; end if;
  log := log || '3.outro-usuario-bloqueado ok; ';

  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  r := public.rpc_panel('TESTA1', k_org);
  if (r->'group'->>'code') <> 'TESTA1' then raise exception 'painel via chave falhou'; end if;
  begin
    r := public.rpc_panel('TESTA1', k_other);
    raise exception 'chave errada abriu painel';
  exception when others then if sqlerrm <> 'NOT_OWNER' then raise; end if; end;
  r := public.rpc_claim('TESTA1', p_a, k_a);
  r := public.rpc_my_result('TESTA1', p_a, k_a);
  if (r->'friend'->>'display_name') <> 'B' then raise exception 'A não leu o próprio resultado'; end if;
  begin
    r := public.rpc_my_result('TESTA1', p_a, k_other);
    raise exception 'outra chave leu resultado de A';
  exception when others then if sqlerrm <> 'NOT_YOURS' then raise; end if; end;
  log := log || '4.chave-do-aparelho ok';
  reset role;
  raise exception 'AUTH TEST PASSED: %', log using errcode = 'P0099';
end $$;
