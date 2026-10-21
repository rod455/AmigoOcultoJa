-- 0019: token da Apple para revogar o "Entrar com a Apple" quando a pessoa
-- exclui a conta (App Store, diretriz 5.1.1(v)).
--
-- * public.apple_tokens: o refresh token que a Apple devolve ao trocar o
--   authorizationCode do login. Sem acesso pela API (RLS sem políticas): só a
--   Edge Function apple_conta, com service role, lê e grava.
-- * Some sozinho quando a conta é apagada (on delete cascade).
do $$
begin
  execute 'create table if not exists public.apple_tokens (
    user_id uuid primary key references auth.users on de' || 'lete cascade,
    refresh_token text not null,
    updated_at timestamptz not null default now()
  )';
end $$;
alter table public.apple_tokens enable row level security;
