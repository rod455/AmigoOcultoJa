-- ID de associado da Amazon definitivo (substitui a etiqueta provisória tirei-20).
update public.app_settings set value = 'amigoocultoja-20' where key = 'affiliate_tag_amazon';
update public.products
   set affiliate_url = replace(affiliate_url, 'tag=tirei-20', 'tag=amigoocultoja-20'), updated_at = now()
 where affiliate_url like '%tag=tirei-20%';
update public.wish_items
   set affiliate_url = replace(affiliate_url, 'tag=tirei-20', 'tag=amigoocultoja-20')
 where affiliate_url like '%tag=tirei-20%';
