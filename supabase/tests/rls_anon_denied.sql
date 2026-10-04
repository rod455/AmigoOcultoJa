-- P0-04: como anon, nenhuma tabela sensível pode ser lida diretamente.
-- Rode no SQL editor do Supabase (ou via CLI). Falha com RLS_TEST_FAILED se algo vazar.
do $$
declare t text; ok int := 0; denied int := 0;
begin
  set local role anon;
  foreach t in array array['groups','participants','exclusions','assignments','wish_items','outbound_clicks','nudges','events','app_settings','organizations','organization_members'] loop
    begin
      execute format('select count(*) from public.%I', t);
      ok := ok + 1;
      raise warning 'LEITURA PERMITIDA em %', t;
    exception when insufficient_privilege then
      denied := denied + 1;
    end;
  end loop;
  reset role;
  raise notice 'denied=% allowed=%', denied, ok;
  if ok > 0 then raise exception 'RLS_TEST_FAILED: % tabelas legíveis por anon', ok; end if;
end $$;
