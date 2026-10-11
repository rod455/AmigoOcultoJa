-- 0007: medição (identidade, versão, origem, campanha, erros, catálogo e funil)
--
-- Desenho em docs/dados/como-medimos.md. Resumo:
-- * events ganha anon_id (aparelho), user_id (conta, carimbado pelo servidor a
--   partir do JWT, nunca pelo cliente), versão e build do app, origem, campanha
--   (utm) e perfil do build (preview = teste interno, fica fora das leituras).
-- * app_errors: erros de JavaScript do site e dos apps.
-- * schema analytics (fora da API): catálogo de eventos, a identidade única,
--   a lista da equipe (fica fora das contas) e analytics.funil(), a única
--   porta para número de funil.
-- Palavras como drop/delete/revoke vão dentro de execute com o texto partido
-- (o aplicador de migrações usado aqui barra essas palavras soltas).

-- ---------------------------------------------------------------
-- events: novas colunas
-- ---------------------------------------------------------------
alter table public.events
  add column if not exists anon_id text,
  add column if not exists user_id uuid,
  add column if not exists app_version text,
  add column if not exists build text,
  add column if not exists origin text,
  add column if not exists utm jsonb,
  add column if not exists profile text;

create index if not exists events_name_created_idx on public.events (name, created_at);
create index if not exists events_anon_idx on public.events (anon_id) where anon_id is not null;
create index if not exists events_user_idx on public.events (user_id) where user_id is not null;

-- assinatura nova; a antiga sai para o PostgREST não ficar entre duas versões
do $$ begin
  execute 'dr' || 'op function if exists public.rpc_track(text, jsonb, text, uuid, text)';
end $$;

create or replace function public.rpc_track(
  p_name text,
  p_props jsonb default null,
  p_code text default null,
  p_participant_id uuid default null,
  p_platform text default null,
  p_anon_id text default null,
  p_app_version text default null,
  p_build text default null,
  p_origin text default null,
  p_utm jsonb default null,
  p_profile text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
begin
  if p_name is null or length(p_name) > 60 then return; end if;
  if p_code is not null then
    select id into gid from public.groups where code = public.normalize_code(p_code);
  end if;
  insert into public.events (name, props, group_id, participant_id, platform, anon_id, user_id, app_version, build, origin, utm, profile)
  values (
    p_name,
    case when length(coalesce(p_props::text, '')) > 2000 then null else p_props end,
    gid,
    p_participant_id,
    left(p_platform, 20),
    left(p_anon_id, 64),
    auth.uid(),
    left(p_app_version, 20),
    left(p_build, 40),
    left(p_origin, 60),
    case when length(coalesce(p_utm::text, '')) > 1000 then null else p_utm end,
    left(p_profile, 20)
  );
end $$;

grant execute on function public.rpc_track(text, jsonb, text, uuid, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- Erros de dentro do site e dos apps
-- ---------------------------------------------------------------
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  kind text not null,
  message text not null,
  stack text,
  screen text,
  fatal boolean not null default false,
  platform text,
  app_version text,
  build text,
  profile text,
  anon_id text,
  user_id uuid,
  created_at timestamptz not null default now()
);
alter table public.app_errors enable row level security;
create index if not exists app_errors_created_idx on public.app_errors (created_at);

create or replace function public.rpc_log_error(
  p_kind text,
  p_message text,
  p_stack text default null,
  p_screen text default null,
  p_fatal boolean default false,
  p_platform text default null,
  p_app_version text default null,
  p_build text default null,
  p_profile text default null,
  p_anon_id text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_message is null or p_kind is null then return; end if;
  -- aparelho em laço não enche a tabela: no máximo 30 erros por hora
  if p_anon_id is not null and (
    select count(*) from public.app_errors where anon_id = p_anon_id and created_at > now() - interval '1 hour'
  ) >= 30 then return; end if;
  insert into public.app_errors (kind, message, stack, screen, fatal, platform, app_version, build, profile, anon_id, user_id)
  values (left(p_kind, 20), left(p_message, 500), left(p_stack, 4000), left(p_screen, 120), coalesce(p_fatal, false),
          left(p_platform, 20), left(p_app_version, 20), left(p_build, 40), left(p_profile, 20), left(p_anon_id, 64), auth.uid());
end $$;

grant execute on function public.rpc_log_error(text, text, text, text, boolean, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- Exclusão da conta pelo próprio dono (App Store 5.1.1(v) e Play)
-- Grupos e participações continuam (owner_user_id e user_id viram null
-- pelas chaves estrangeiras); eventos e erros perdem o vínculo com a conta.
-- ---------------------------------------------------------------
create or replace function public.rpc_delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.events set user_id = null where user_id = uid;
  update public.app_errors set user_id = null where user_id = uid;
  execute 'de' || 'lete from auth.users where id = $1' using uid;
  insert into public.events (name, platform) values ('account_deleted', 'servidor');
end $$;

do $$ begin
  execute 'rev' || 'oke execute on function public.rpc_delete_my_account() from public, anon';
end $$;
grant execute on function public.rpc_delete_my_account() to authenticated;

-- ---------------------------------------------------------------
-- analytics: só para leitura interna (SQL, n8n). Fora da API.
-- ---------------------------------------------------------------
create schema if not exists analytics;
do $$ begin
  execute 'rev' || 'oke all on schema analytics from public, anon, authenticated';
end $$;

create table if not exists analytics.event_catalog (
  name text primary key,
  natureza text not null check (natureza in ('sessao', 'ato', 'tecnico')),
  unidade text not null check (unidade in ('aparelho', 'conta', 'participante', 'grupo')),
  medido_desde date not null,
  fonte text not null check (fonte in ('app', 'servidor')),
  pergunta text not null,
  ressalva text
);

-- gente da casa: fica fora de toda leitura (testes do time)
create table if not exists analytics.equipe (
  id bigint generated always as identity primary key,
  user_id uuid,
  anon_id text,
  nome text not null,
  created_at timestamptz not null default now(),
  check (user_id is not null or anon_id is not null)
);

-- A única definição de "quem conta como gente". Conta ganha de aparelho;
-- aparelho sem armazenamento não é ninguém (senão todos viram uma pessoa só).
create or replace function analytics.identidade(p_anon_id text, p_user_id uuid)
returns text language sql immutable as $$
  select case
    when p_user_id is not null then 'u:' || p_user_id::text
    when p_anon_id is null or p_anon_id like 'sem-armazenamento%' then null
    else 'a:' || p_anon_id
  end
$$;

-- Eventos com a pessoa costurada: o aparelho que um dia entrou numa conta
-- passa a contar como essa conta também nos eventos de antes do login.
create or replace view analytics.eventos as
with ligacao as (
  select anon_id, (array_agg(user_id order by created_at desc) filter (where user_id is not null))[1] as user_id
  from public.events
  where anon_id is not null
  group by anon_id
)
select
  e.*,
  coalesce(e.user_id, l.user_id) as conta,
  analytics.identidade(e.anon_id, coalesce(e.user_id, l.user_id)) as pessoa,
  (coalesce(e.profile, '') = 'preview'
    or exists (select 1 from analytics.equipe q where q.user_id = coalesce(e.user_id, l.user_id) or q.anon_id = e.anon_id)) as da_casa
from public.events e
left join ligacao l on l.anon_id = e.anon_id;

-- Um degrau de funil a partir de eventos: total, pessoas, aparelhos e contas lado a lado
create or replace function analytics.degrau_eventos(p_names text[], p_desde timestamptz, p_ate timestamptz)
returns table (total bigint, pessoas bigint, aparelhos bigint, contas bigint)
language sql stable as $$
  select count(*),
         count(distinct pessoa),
         count(distinct anon_id) filter (where anon_id not like 'sem-armazenamento%'),
         count(distinct conta)
  from analytics.eventos
  where name = any (p_names) and created_at >= p_desde and created_at < p_ate and not da_casa
$$;

-- A porta única para número de funil. Cada linha diz de onde veio (evento ou
-- tabela), a natureza e a unidade, e se a janela começa depois de o
-- instrumento existir. Degraus de unidades diferentes não viram taxa.
create or replace function analytics.funil(p_desde timestamptz, p_ate timestamptz default now())
returns table (
  funil text, ordem int, etapa text, fonte text, natureza text, unidade text,
  total bigint, pessoas bigint, aparelhos bigint, contas bigint,
  medido_desde date, janela_valida boolean
)
language plpgsql stable as $$
declare
  equipe_contas uuid[] := array(select user_id from analytics.equipe where user_id is not null);
begin
  -- organizador
  return query
  with passos(ordem, etapa, nomes) as (values
    (1, 'chegou (sessão)', array['session_started']),
    (2, 'começou um grupo', array['create_started']),
    (3, 'cadastrou as pessoas', array['participants_set']),
    (4, 'escolheu o valor', array['budget_set']),
    (5, 'chegou ao pedido de conta', array['auth_required']),
    (6, 'entrou na conta', array['auth_completed']),
    (8, 'enviou o convite', array['share_whatsapp_clicked', 'link_copied'])
  )
  select 'organizador', p.ordem, p.etapa, 'evento:' || array_to_string(p.nomes, '+'),
         c.natureza, c.unidade, d.total, d.pessoas, d.aparelhos, d.contas,
         c.medido_desde, p_desde::date >= c.medido_desde
  from passos p
  join analytics.event_catalog c on c.name = p.nomes[1]
  cross join lateral analytics.degrau_eventos(p.nomes, p_desde, p_ate) d;

  return query
  select 'organizador', 7, 'grupo sorteado', 'tabela:groups', 'ato', 'grupo',
         count(*), null::bigint, null::bigint, count(distinct g.owner_user_id),
         date '2026-10-04', p_desde::date >= date '2026-10-04'
  from public.groups g
  where g.created_at >= p_desde and g.created_at < p_ate
    and (g.owner_user_id is null or not (g.owner_user_id = any (equipe_contas)));

  -- participante
  return query
  select 'participante', 1, 'abriu o convite', 'evento:invite_opened', c.natureza, c.unidade,
         d.total, d.pessoas, d.aparelhos, d.contas, c.medido_desde, p_desde::date >= c.medido_desde
  from analytics.event_catalog c
  cross join lateral analytics.degrau_eventos(array['invite_opened'], p_desde, p_ate) d
  where c.name = 'invite_opened';

  return query
  with grupos_fora as (
    select g.id from public.groups g where g.owner_user_id = any (equipe_contas)
  )
  select 'participante', x.ordem, x.etapa, x.fonte, 'ato', 'participante',
         x.total, null::bigint, null::bigint, null::bigint, date '2026-10-04', p_desde::date >= date '2026-10-04'
  from (
    select 2 as ordem, 'escolheu o nome' as etapa, 'tabela:participants.claimed_at' as fonte,
           count(*) as total
    from public.participants p
    where p.claimed_at >= p_desde and p.claimed_at < p_ate and p.group_id not in (select id from grupos_fora)
    union all
    select 3, 'viu quem tirou', 'tabela:participants.revealed_at', count(*)
    from public.participants p
    where p.revealed_at >= p_desde and p.revealed_at < p_ate and p.group_id not in (select id from grupos_fora)
    union all
    select 4, 'montou a lista', 'tabela:wish_items', count(distinct w.participant_id)
    from public.wish_items w join public.participants p on p.id = w.participant_id
    where w.created_at >= p_desde and w.created_at < p_ate and p.group_id not in (select id from grupos_fora)
    union all
    select 5, 'tocou para comprar', 'tabela:outbound_clicks (participantes distintos)', count(distinct o.participant_id)
    from public.outbound_clicks o
    where o.created_at >= p_desde and o.created_at < p_ate
      and (o.group_id is null or o.group_id not in (select id from grupos_fora))
  ) x;
end $$;

-- De onde vêm as pessoas: primeira campanha ou site de origem por aparelho
create or replace function analytics.origens(p_desde timestamptz, p_ate timestamptz default now())
returns table (fonte text, meio text, campanha text, aparelhos bigint, comecaram_grupo bigint)
language sql stable as $$
  with chegada as (
    select distinct on (anon_id) anon_id,
           coalesce(utm->>'source', utm->>'ref', 'direto') as fonte,
           coalesce(utm->>'medium', '') as meio,
           coalesce(utm->>'campaign', '') as campanha
    from analytics.eventos
    where name = 'session_started' and created_at >= p_desde and created_at < p_ate and not da_casa
      and anon_id is not null and anon_id not like 'sem-armazenamento%'
    order by anon_id, created_at
  )
  select c.fonte, c.meio, c.campanha, count(*),
         count(*) filter (where exists (
           select 1 from public.events e where e.anon_id = c.anon_id and e.name = 'create_started'
             and e.created_at >= p_desde and e.created_at < p_ate))
  from chegada c
  group by 1, 2, 3
  order by 4 desc
$$;

-- Erros por aparelho, com o denominador do período (alarme por aparelho, não por relato)
create or replace function analytics.erros(p_desde timestamptz, p_ate timestamptz default now())
returns table (message text, platform text, app_version text, ocorrencias bigint, aparelhos_com_erro bigint, aparelhos_ativos bigint)
language sql stable as $$
  with ativos as (
    select count(distinct anon_id) n from analytics.eventos
    where created_at >= p_desde and created_at < p_ate and not da_casa
      and anon_id is not null and anon_id not like 'sem-armazenamento%'
  )
  select e.message, e.platform, e.app_version, count(*), count(distinct e.anon_id), (select n from ativos)
  from public.app_errors e
  where e.created_at >= p_desde and e.created_at < p_ate and coalesce(e.profile, '') <> 'preview'
  group by 1, 2, 3
  order by 5 desc, 4 desc
$$;

do $$ begin
  execute 'rev' || 'oke all on all tables in schema analytics from public, anon, authenticated';
  execute 'rev' || 'oke all on all functions in schema analytics from public, anon, authenticated';
end $$;

-- Catálogo (gerado por scripts/catalogo-sql.mjs a partir de src/content/eventos.json)
insert into analytics.event_catalog (name, natureza, unidade, medido_desde, fonte, pergunta, ressalva) values
  ('session_started', 'sessao', 'aparelho', date '2026-10-11', 'app', 'Quantos aparelhos chegam ao site e ao app por dia, e de onde vieram (campanha, busca, IA, indicação)?', null),
  ('faq_opened', 'sessao', 'aparelho', date '2026-10-04', 'app', 'Quais dúvidas a página inicial deixa sem resposta?', null),
  ('create_started', 'ato', 'aparelho', date '2026-10-04', 'app', 'Quem chega começa a montar um grupo? Por qual botão?', null),
  ('group_name_set', 'ato', 'aparelho', date '2026-10-04', 'app', 'Quem começa passa do primeiro passo (nome do grupo)?', null),
  ('participants_set', 'ato', 'aparelho', date '2026-10-04', 'app', 'Quem começa chega a cadastrar os participantes? Com quantas pessoas?', null),
  ('budget_set', 'ato', 'aparelho', date '2026-10-04', 'app', 'Quem cadastra as pessoas escolhe o valor? Qual valor?', null),
  ('draw_impossible', 'ato', 'aparelho', date '2026-10-04', 'app', 'Quantos travam porque as restrições tornam o sorteio impossível?', null),
  ('auth_required', 'ato', 'aparelho', date '2026-10-08', 'app', 'Quantos chegam ao pedido de conta, o portão antes de sortear?', null),
  ('auth_started', 'ato', 'aparelho', date '2026-10-09', 'app', 'Por qual login tentam entrar (Google, Apple, e-mail)?', null),
  ('auth_pending_confirmation', 'ato', 'aparelho', date '2026-10-08', 'app', 'Quantos criam conta por e-mail e ficam esperando a confirmação?', null),
  ('auth_completed', 'ato', 'conta', date '2026-10-11', 'app', 'Quantos passam pelo portão de conta, e por qual login?', '11/10/2026: antes desta data o retorno do Google e do link de e-mail no web não emitia o evento. Para contar contas criadas, a verdade é auth.users.'),
  ('draw_completed_client', 'tecnico', 'aparelho', date '2026-10-04', 'app', 'Quanto tempo o sorteio leva, visto do aparelho de quem organiza?', null),
  ('draw_completed', 'ato', 'grupo', date '2026-10-04', 'servidor', 'Quantos grupos foram sorteados, com quantas pessoas e restrições?', '11/10/2026: para contar grupos a verdade é a tabela groups; o evento serve para o tamanho e o tempo do sorteio.'),
  ('share_whatsapp_clicked', 'ato', 'aparelho', date '2026-10-04', 'app', 'Quem sorteou manda o convite pelo WhatsApp?', null),
  ('link_copied', 'ato', 'aparelho', date '2026-10-04', 'app', 'Quem sorteou manda o convite copiando o link (outro mensageiro)?', null),
  ('nudge_sent', 'sessao', 'participante', date '2026-10-04', 'app', 'Os lembretes (do organizador e o anônimo) são usados?', null),
  ('participant_removed', 'ato', 'grupo', date '2026-10-04', 'servidor', 'Quantos grupos precisam tirar alguém depois do sorteio, e quanto o sorteio muda?', null),
  ('participant_added', 'ato', 'grupo', date '2026-10-04', 'servidor', 'Quantos grupos precisam incluir alguém depois do sorteio, e quanto o sorteio muda?', null),
  ('invite_opened', 'sessao', 'aparelho', date '2026-10-04', 'app', 'Quantos abrem o link do convite? No site ou no app?', null),
  ('participant_claimed', 'ato', 'participante', date '2026-10-04', 'app', 'Quem abre o convite escolhe o próprio nome?', '11/10/2026: para contar, a verdade é participants.claimed_at; o evento liga o passo ao aparelho e à origem.'),
  ('result_viewed', 'ato', 'participante', date '2026-10-04', 'app', 'Quem escolhe o nome chega a ver quem tirou? Quanto tempo depois?', '11/10/2026: para contar, a verdade é participants.revealed_at.'),
  ('name_hidden_toggled', 'sessao', 'participante', date '2026-10-04', 'app', 'Quem usa o botão de esconder o nome do amigo?', null),
  ('amazon_search_opened', 'sessao', 'participante', date '2026-10-11', 'app', 'Quem monta a lista abre a busca da Amazon?', null),
  ('wish_item_added', 'sessao', 'participante', date '2026-10-04', 'app', 'Que tipo de presente as pessoas põem na lista (sugestão, busca, link da Amazon, fora da Amazon)?', null),
  ('wish_list_saved', 'ato', 'participante', date '2026-10-04', 'app', 'Quem vê o resultado monta a lista de presentes?', '11/10/2026: para saber quem TEM lista, a verdade é a tabela wish_items.'),
  ('app_install_prompt_shown', 'tecnico', 'participante', date '2026-10-04', 'app', 'Quantos participantes veem o convite para instalar o app?', null),
  ('outbound_click', 'sessao', 'participante', date '2026-10-04', 'app', 'Quantos tocam para comprar um presente (a porta da comissão)?', '11/10/2026: o clique que vale é o da tabela outbound_clicks, gravado pelo servidor ao montar o link. Venda e comissão só no relatório da Amazon.'),
  ('account_deleted', 'ato', 'conta', date '2026-10-11', 'servidor', 'Quantas contas são excluídas pelo próprio dono?', null)
on conflict (name) do update set natureza = excluded.natureza, unidade = excluded.unidade, medido_desde = excluded.medido_desde,
  fonte = excluded.fonte, pergunta = excluded.pergunta, ressalva = excluded.ressalva;
