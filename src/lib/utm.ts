/**
 * De onde a pessoa chegou: campanha (utm_*), clique pago (gclid/fbclid) e o
 * site que mandou a visita (referrer). Funções puras; quem grava é
 * src/lib/attribution.ts. Vocabulário fechado: tudo minúsculo e sem acento,
 * porque "Instagram", "instagram" e "ínstagram" viram três origens.
 */
export type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  gclid?: string;
  fbclid?: string;
  /** host do site que mandou a visita, sem www (ex.: google.com.br, chatgpt.com) */
  ref?: string;
  /** página onde a pessoa chegou */
  landing?: string;
  /** quando chegou (ISO) */
  at?: string;
};

const OWN_HOSTS = ['amigoocultoja.com.br'];

export function normalizeTag(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const t = v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._\-]/g, '')
    .slice(0, 60);
  return t || undefined;
}

export function referrerHost(referrer: string | null | undefined): string | undefined {
  if (!referrer) return undefined;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  host = host.replace(/^www\./, '');
  if (!host || OWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return undefined;
  return host.slice(0, 60);
}

/** Lê a chegada a partir do `?query` e do referrer. Sem nenhum sinal, devolve null. */
export function parseAttribution(search: string, referrer: string | null | undefined, landing?: string): Attribution | null {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const a: Attribution = {
    source: normalizeTag(q.get('utm_source')),
    medium: normalizeTag(q.get('utm_medium')),
    campaign: normalizeTag(q.get('utm_campaign')),
    content: normalizeTag(q.get('utm_content')),
    term: normalizeTag(q.get('utm_term')),
    gclid: q.get('gclid')?.slice(0, 120) || undefined,
    fbclid: q.get('fbclid')?.slice(0, 120) || undefined,
    ref: referrerHost(referrer),
  };
  // clique pago sem utm ainda diz de onde veio
  if (!a.source && a.gclid) a.source = 'google';
  if (!a.source && a.fbclid) a.source = 'meta';
  if (a.gclid && !a.medium) a.medium = 'cpc';
  const hasSignal = Object.values(a).some(Boolean);
  if (!hasSignal) return null;
  return clean({ ...a, landing: landing?.slice(0, 120) });
}

/** Play Store: "utm_source=google-play&utm_medium=organic" (o link da loja pode trazer a campanha). */
export function parseInstallReferrer(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // fica como veio
  }
  return parseAttribution(decoded, null, 'instalacao-play');
}

function clean(a: Attribution): Attribution {
  return Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== '')) as Attribution;
}
