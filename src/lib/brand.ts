/**
 * Marca da empresa no grupo (groups.theme, migração 0009). Funções puras:
 * a empresa escolhe a cor que quiser, e daqui sai uma paleta que continua
 * legível (contraste WCAG AA) mesmo com cor clara, como amarelo ou verde-limão.
 */
import { colors } from '../theme/tokens';

export type GroupBrand = {
  name?: string;
  /** caminho no bucket group-logos: <id do grupo>/<arquivo> */
  logo?: string;
  primary: string;
  secondary?: string;
};

/** Paleta usada pelos botões e destaques das telas do grupo. */
export type Accent = {
  /** fundo do botão principal e dos destaques */
  accent: string;
  /** botão pressionado */
  accentDark: string;
  /** texto sobre `accent` (branco ou carvão, o que tiver mais contraste) */
  onAccent: string;
  /** texto e links na cor da marca sobre fundo branco (escurecida até ficar legível) */
  accentText: string;
  /** fundo claro de apoio (faixa do logo, chips) */
  tint: string;
};

export const DEFAULT_ACCENT: Accent = {
  accent: colors.accent,
  accentDark: colors.accentDark,
  onAccent: '#FFFFFF',
  accentText: colors.accentDark,
  tint: colors.peach,
};

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX.test(v.trim());
}

/** "#ff6600", "ff6600" ou "#F60" → "#FF6600"; inválido → null. */
export function normalizeHex(v: string): string | null {
  let s = v.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(s) ? `#${s.toUpperCase()}` : null;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Mistura `a` com `b` (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Luminância relativa (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Escurece até atingir o contraste mínimo contra o branco (texto na cor da marca). */
function readableOnWhite(hex: string, min = 4.5): string {
  let c = hex;
  for (let i = 0; i < 20 && contrast(c, '#FFFFFF') < min; i++) c = mix(c, '#000000', 0.08);
  return c;
}

export function accentFrom(brand: GroupBrand | null | undefined): Accent {
  if (!brand || !isHexColor(brand.primary)) return DEFAULT_ACCENT;
  const accent = brand.primary.toUpperCase();
  const onAccent = contrast(accent, '#FFFFFF') >= contrast(accent, colors.text) ? '#FFFFFF' : colors.text;
  const tintSource = isHexColor(brand.secondary) ? brand.secondary : accent;
  return {
    accent,
    accentDark: mix(accent, '#000000', 0.18),
    onAccent,
    accentText: readableOnWhite(accent),
    tint: mix(tintSource, '#FFFFFF', 0.86),
  };
}

/** Lê o theme vindo do banco; qualquer coisa fora do formato vira "sem marca". */
export function parseBrand(raw: unknown): GroupBrand | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isHexColor(r.primary)) return null;
  return {
    primary: r.primary,
    secondary: isHexColor(r.secondary) ? r.secondary : undefined,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 60) : undefined,
    logo: typeof r.logo === 'string' && /^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,64}\.(png|jpe?g|webp)$/.test(r.logo) ? r.logo : undefined,
  };
}

export function brandLogoUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/group-logos/${path}`;
}

/**
 * Cor mais marcante de um logo (pixels RGBA): ignora transparente, quase
 * branco, quase preto e cinzas, e agrupa tons parecidos. Sem cor marcante,
 * devolve null (logo preto e branco: a empresa escolhe a cor).
 */
export function dominantColor(data: ArrayLike<number>): string | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mx > 245 && mn > 235) continue; // branco
    if (mx < 30) continue; // preto
    if (mx - mn < 28) continue; // cinza
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n += 1;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    buckets.set(key, cur);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const v of buckets.values()) if (!best || v.n > best.n) best = v;
  if (!best || best.n < 12) return null;
  return toHex([best.r / best.n, best.g / best.n, best.b / best.n]);
}
