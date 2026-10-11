// Edge Function `resolve_amazon_link`: abre links curtos da Amazon
// (a.co/d/…, amzn.to/…) seguindo só os redirecionamentos, sem baixar a página
// do produto, e devolve o ASIN. O link final é montado no banco com o nosso ID
// de associado (rpc_set_wish_items), nunca com a URL recebida.
//
// POST { text } → 200 { asin } | 422 { code: 'NOT_AMAZON' | 'NO_PRODUCT', message }

import { asinFromUrl, isAmazonHost, parseAmazonInput } from '../_shared/amazon.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const NOT_AMAZON = { code: 'NOT_AMAZON', message: 'Esse link não é da Amazon. Copie o link da página do produto na Amazon.' };
const NO_PRODUCT = { code: 'NO_PRODUCT', message: 'Não encontramos um produto nesse link. Abra a página do produto e copie o link de lá.' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ code: 'METHOD', message: 'Use POST.' }, 405);

  let text = '';
  try {
    const body = await req.json();
    text = String(body?.text ?? '').slice(0, 2000);
  } catch {
    return json(NOT_AMAZON, 422);
  }

  const parsed = parseAmazonInput(text);
  if (parsed.kind === 'asin') return json({ asin: parsed.asin });
  if (parsed.kind === 'not_amazon') return json(NOT_AMAZON, 422);
  if (parsed.kind === 'no_product') return json(NO_PRODUCT, 422);

  // link curto: segue até 5 redirecionamentos, lendo só o cabeçalho Location
  let current = parsed.url;
  for (let i = 0; i < 5; i++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AmigoOcultoJa/1.0; +https://amigoocultoja.com.br)' },
      });
    } catch {
      break;
    }
    const location = res.headers.get('location');
    await res.body?.cancel();
    if (!location) break;
    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      break;
    }
    if (!isAmazonHost(next.hostname)) return json(NOT_AMAZON, 422);
    current = next.toString();
    const asin = asinFromUrl(current);
    if (asin) return json({ asin });
  }
  return json(NO_PRODUCT, 422);
});
