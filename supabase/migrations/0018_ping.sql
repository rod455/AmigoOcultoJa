-- 0018: rpc_ping, chamada a cada 6 horas pelo GitHub Actions
-- (.github/workflows/supabase-ativo.yml). No plano grátis o Supabase pausa o
-- projeto depois de alguns dias sem uso; a chamada conta como uso e, se o
-- banco não responder, o job falha e o GitHub avisa o dono por e-mail.
create or replace function public.rpc_ping()
returns timestamptz language sql stable security definer set search_path = public as $$
  select now()
$$;
grant execute on function public.rpc_ping() to anon, authenticated;
