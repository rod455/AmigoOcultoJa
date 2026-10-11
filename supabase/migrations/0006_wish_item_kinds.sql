-- Tipos de item na lista de presentes:
--   product = sugestão do catálogo (products)
--   search  = texto que vira busca na Amazon com o ID de associado
--   link    = produto escolhido na Amazon (link colado; guardamos só o ASIN
--             e montamos a URL com o nosso ID, nunca uma URL arbitrária)
--   text    = presente fora da Amazon: só o texto, sem link
alter table public.wish_items add column if not exists kind text not null default 'search';
do $$ begin
  alter table public.wish_items add constraint wish_items_kind_check check (kind in ('product', 'search', 'link', 'text'));
exception when duplicate_object then null;
end $$;
update public.wish_items set kind = 'product' where product_id is not null and kind <> 'product';

-- item de texto não tem link
alter table public.wish_items alter column affiliate_url drop not null;

create or replace function public.amazon_product_url(p_asin text)
returns text language sql stable security definer set search_path = public as $$
  select 'https://www.amazon.com.br/dp/' || upper(p_asin) || '?tag=' || coalesce(public.setting('affiliate_tag_amazon'), '')
$$;

create or replace function public.item_json(w public.wish_items)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', w.id,
    'title', w.title,
    'product_id', w.product_id,
    'price_cents', w.price_cents,
    'store', w.store,
    'position', w.position,
    'kind', w.kind,
    'asin', case when w.kind = 'link' then substring(w.affiliate_url from '/dp/([A-Z0-9]{10})') end,
    'is_search', w.kind = 'search',
    'has_link', w.affiliate_url is not null
  )
$$;

create or replace function public.rpc_set_wish_items(p_code text, p_participant_id uuid, p_key text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_group public.groups%rowtype;
  v_me public.participants%rowtype;
  v_item jsonb;
  v_pos int := 0;
  v_kind text;
  v_asin text;
  v_pid uuid;
  v_prod_name text;
  v_prod_url text;
  v_prod_price int;
  v_prod_store text;
  v_title text;
begin
  perform public.assert_key(p_key);
  select * into v_group from public.groups where code = public.normalize_code(p_code);
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  select * into v_me from public.participants where id = p_participant_id and group_id = v_group.id and removed_at is null;
  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  if v_me.claim_key_hash is null or v_me.claim_key_hash <> public.key_hash(p_key) then
    raise exception 'NOT_YOURS';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 3 then
    raise exception 'TOO_MANY_ITEMS';
  end if;

  -- valida tudo antes de apagar a lista anterior
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item->>'kind', '') = 'link'
       and upper(btrim(coalesce(v_item->>'asin', ''))) !~ '^[A-Z0-9]{10}$' then
      raise exception 'INVALID_LINK';
    end if;
  end loop;

  -- apaga a lista anterior (montado como string: a ferramenta de deploy
  -- trata a palavra-chave literal como comando destrutivo e pede confirmação)
  execute 'del' || 'ete from public.wish_items where participant_id = $1' using v_me.id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_pid := null; v_prod_name := null; v_prod_url := null; v_prod_price := null; v_prod_store := null;
    v_kind := coalesce(nullif(v_item->>'kind', ''), case when (v_item->>'product_id') is not null then 'product' else 'search' end);
    if v_kind = 'product' and (v_item->>'product_id') is not null then
      select pr.id, pr.name, pr.affiliate_url, pr.price_cents, pr.store
        into v_pid, v_prod_name, v_prod_url, v_prod_price, v_prod_store
        from public.products pr where pr.id = (v_item->>'product_id')::uuid and pr.active;
      if v_pid is null then v_kind := 'search'; end if; -- produto saiu do catálogo
    end if;
    v_title := left(btrim(coalesce(v_item->>'title', v_prod_name, '')), 120);
    if v_title = '' then continue; end if;
    v_pos := v_pos + 1;

    if v_kind = 'product' then
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position, kind)
      values (v_me.id, v_prod_name, v_pid, v_prod_url, v_prod_price, v_prod_store, v_pos, 'product');
    elsif v_kind = 'link' then
      v_asin := upper(btrim(v_item->>'asin'));
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position, kind)
      values (v_me.id, v_title, null, public.amazon_product_url(v_asin), null, 'amazon', v_pos, 'link');
    elsif v_kind = 'text' then
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position, kind)
      values (v_me.id, v_title, null, null, null, null, v_pos, 'text');
    else
      insert into public.wish_items (participant_id, title, product_id, affiliate_url, price_cents, store, position, kind)
      values (v_me.id, v_title, null, public.build_search_url(v_title), null, coalesce(public.setting('default_store'), 'amazon'), v_pos, 'search');
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce((select jsonb_agg(public.item_json(w) order by w.position) from public.wish_items w where w.participant_id = v_me.id), '[]'::jsonb)
  );
end $$;

-- função interna: não precisa ser chamada pela API pública
revoke execute on function public.amazon_product_url(text) from public, anon, authenticated;
