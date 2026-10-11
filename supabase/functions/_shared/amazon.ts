/**
 * Links da Amazon colados por quem participa (sem dependências: roda no app e
 * na Edge Function). Aceitamos só amazon.com.br e os encurtadores da Amazon;
 * guardamos apenas o ASIN e montamos a URL final com o nosso ID de associado.
 */

const HOST_RE = /(^|\.)(amazon\.com\.br|a\.co|amzn\.to)$/i;
const SHORT_HOST_RE = /(^|\.)(a\.co|amzn\.to)$/i;
const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN|o\/ASIN)\/([A-Z0-9]{10})(?=[/?#]|$)/i;

export type AmazonInput =
  | { kind: 'asin'; asin: string; url: string }
  | { kind: 'short'; url: string }
  | { kind: 'not_amazon' }
  | { kind: 'no_product'; url: string };

/** Primeiro endereço dentro de um texto colado ("Veja este produto: https://a.co/d/abc"). */
export function firstUrl(text: string): string | null {
  const t = (text ?? '').trim();
  const m = t.match(/https?:\/\/[^\s<>"']+/i) ?? t.match(/(?:^|\s)((?:www\.)?(?:amazon\.com\.br|a\.co|amzn\.to)\/[^\s<>"']*)/i);
  if (!m) return null;
  const raw = (m[1] ?? m[0]).trim().replace(/[).,;!]+$/, '');
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function isAmazonHost(host: string): boolean {
  return HOST_RE.test(host);
}

export function isShortHost(host: string): boolean {
  return SHORT_HOST_RE.test(host);
}

export function asinFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!isAmazonHost(u.hostname) || isShortHost(u.hostname)) return null;
    const m = decodeURIComponent(u.pathname).match(ASIN_RE);
    return m ? m[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

/** Classifica o que a pessoa colou. */
export function parseAmazonInput(text: string): AmazonInput {
  const url = firstUrl(text);
  if (!url) return { kind: 'not_amazon' };
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return { kind: 'not_amazon' };
  }
  if (!isAmazonHost(host)) return { kind: 'not_amazon' };
  if (isShortHost(host)) return { kind: 'short', url };
  const asin = asinFromUrl(url);
  return asin ? { kind: 'asin', asin, url } : { kind: 'no_product', url };
}
