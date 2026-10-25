#!/usr/bin/env node
// Páginas de conteúdo: cada src/content/paginas/*.md vira uma página estática
// do site ("/<slug>"), e cada src/content/paginas/presentes/*.md vira
// "/presentes/<slug>". Roda antes do export (npm run build) e gera:
//   - src/content/paginas.gen.json  (lido pelas rotas [slug] e presentes/[slug])
//   - public/sitemap.xml            (páginas fixas + páginas de conteúdo)
// Arquivos que começam com "_" (como _modelo.md) não são publicados.
// Cabeçalho (frontmatter) obrigatório: title, description, slug, updated
// (AAAA-MM-DD), author (id em src/content/autores.json). Opcional: faq (lista
// de { q, a }).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import YAML from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/content/paginas');
const site = JSON.parse(fs.readFileSync(path.join(root, 'src/content/site.json'), 'utf8'));
const autores = JSON.parse(fs.readFileSync(path.join(root, 'src/content/autores.json'), 'utf8'));

// rotas que já existem na raiz do site: uma página de conteúdo não pode tomar o lugar delas
const RESERVED = new Set(['app', 'auth', 'conta', 'criar', 'empresas', 'entrar', 'g', 'minha-conta', 'painel', 'presentes', 'privacidade', 'pronto', 'r', 'suporte', 'termos', 'modelos', 'autores', 'brand', 'email']);
const FIXED = [
  ['/', '1.0', 'weekly'],
  ['/empresas', '0.9', 'weekly'],
  ['/privacidade', '0.3', 'yearly'],
  ['/termos', '0.3', 'yearly'],
  ['/suporte', '0.4', 'monthly'],
];

const errors = [];
const pages = [];

function read(file, kind) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const rel = path.relative(root, file);
  if (!m) return errors.push(`${rel}: falta o cabeçalho entre linhas "---"`);
  let fm;
  try {
    fm = YAML.parse(m[1]) ?? {};
  } catch (e) {
    return errors.push(`${rel}: cabeçalho inválido (${e.message.split('\n')[0]})`);
  }
  for (const k of ['title', 'description', 'slug', 'updated', 'author']) if (!fm[k]) errors.push(`${rel}: falta "${k}" no cabeçalho`);
  if (!fm.slug) return;
  const slug = String(fm.slug).replace(/^\/+|\/+$/g, '').replace(/^presentes\//, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push(`${rel}: slug "${fm.slug}" deve ter só letras minúsculas, números e hífens`);
  if (kind === 'raiz' && RESERVED.has(slug)) errors.push(`${rel}: o slug "${slug}" já é uma página do site`);
  const updated = fm.updated instanceof Date ? fm.updated.toISOString().slice(0, 10) : String(fm.updated ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) errors.push(`${rel}: updated deve ser AAAA-MM-DD`);
  const authorId = String(fm.author ?? '');
  if (authorId && !autores[authorId]) errors.push(`${rel}: autor "${authorId}" não está em src/content/autores.json`);
  if (String(fm.title ?? '').length > 70) errors.push(`${rel}: title com mais de 70 letras (o Google corta)`);
  if (String(fm.description ?? '').length > 160) errors.push(`${rel}: description com mais de 160 letras (o Google corta)`);
  const faq = (Array.isArray(fm.faq) ? fm.faq : []).map((f, i) => {
    const q = Array.isArray(f) ? f[0] : (f?.q ?? f?.pergunta);
    const a = Array.isArray(f) ? f[1] : (f?.a ?? f?.resposta);
    if (!q || !a) errors.push(`${rel}: faq[${i}] precisa de q e a`);
    return [String(q ?? ''), String(a ?? '')];
  });
  const body = m[2].trim();
  // o H1 é o title do cabeçalho: um "# Título" no começo do texto sairia repetido
  const md = body.replace(/^#\s+.*\n+/, '');
  const pagePath = kind === 'presentes' ? `/presentes/${slug}` : `/${slug}`;
  pages.push({
    kind,
    slug,
    path: pagePath,
    title: String(fm.title ?? ''),
    description: String(fm.description ?? ''),
    updated,
    author: authorId,
    faq,
    html: marked.parse(md, { gfm: true, async: false }),
    words: md.split(/\s+/).filter(Boolean).length,
  });
}

for (const [sub, kind] of [['', 'raiz'], ['presentes', 'presentes']]) {
  const d = path.join(dir, sub);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).sort()) {
    if (!f.endsWith('.md') || f.startsWith('_') || f.toLowerCase() === 'readme.md') continue;
    read(path.join(d, f), kind);
  }
}
const seen = new Map();
for (const p of pages) {
  if (seen.has(p.path)) errors.push(`${p.path} aparece em dois arquivos`);
  seen.set(p.path, true);
}
if (errors.length) {
  console.error(`paginas: ${errors.length} problema(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

fs.writeFileSync(path.join(root, 'src/content/paginas.gen.json'), JSON.stringify(pages, null, 2) + '\n');

// Fontes Figtree com os nomes que o app usa (Figtree_700Bold...), servidas em
// /fonts: as páginas de conteúdo saem sem o JavaScript que registra as fontes,
// e o CSS de src/app/+html.tsx aponta para estes arquivos.
const fontsDir = path.join(root, 'public/fonts');
fs.mkdirSync(fontsDir, { recursive: true });
for (const w of ['400Regular', '500Medium', '600SemiBold', '700Bold', '800ExtraBold']) {
  fs.copyFileSync(path.join(root, 'node_modules/@expo-google-fonts/figtree', w, `Figtree_${w}.ttf`), path.join(fontsDir, `Figtree_${w}.ttf`));
}

const today = new Date().toISOString().slice(0, 10);
const fixedUpdated = JSON.parse(fs.readFileSync(path.join(root, 'src/content/sitemap-fixo.json'), 'utf8'));
const urls = [
  ...FIXED.map(([p, priority, freq]) => ({ loc: `${site.url}${p === '/' ? '/' : p}`, lastmod: fixedUpdated[p] ?? today, priority, freq })),
  ...pages.map((p) => ({ loc: `${site.url}${p.path}`, lastmod: p.updated, priority: '0.8', freq: 'monthly' })),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(root, 'public/sitemap.xml'), xml);
console.log(`paginas: ${pages.length} página(s) de conteúdo; sitemap com ${urls.length} endereços`);
