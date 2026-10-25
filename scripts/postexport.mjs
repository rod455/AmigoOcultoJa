// Pós-export para hospedagem estática (Vercel):
// renomeia as rotas dinâmicas `pasta/[param].html` para `pasta/index.html`,
// para que as rewrites do vercel.json possam apontar para um caminho sem
// colchetes. Rode depois de `expo export -p web`.
import { readdirSync, renameSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
if (!existsSync(dist)) {
  console.error('dist/ não existe. Rode `npx expo export -p web` antes.');
  process.exit(1);
}

// Moldes das páginas de conteúdo: cada página já sai pronta do export
// (generateStaticParams); o molde vazio não deve virar endereço.
import { rmSync } from 'node:fs';
for (const molde of ['[slug].html', 'presentes/[slug].html']) rmSync(join(dist, molde), { force: true });

let renamed = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    const m = name.match(/^\[([^\]]+)\]\.html$/);
    if (m) {
      const target = join(dir, 'index.html');
      if (existsSync(target)) {
        console.warn(`já existe ${target}; mantendo ${name}`);
        continue;
      }
      renameSync(full, target);
      renamed++;
      console.log(`${full.replace(dist, '')} → ${target.replace(dist, '')}`);
    }
  }
}
walk(dist);
console.log(`postexport: ${renamed} rota(s) dinâmica(s) renomeada(s).`);

// Páginas de conteúdo (src/content/paginas): saem sem o JavaScript do app.
// O HTML já vem completo do export (texto, links e estilos); sem o bundle,
// a página abre rápido. A tag do Google (script inline + gtag.js) fica.
import { readFileSync, writeFileSync } from 'node:fs';
const conteudoFile = join(process.cwd(), 'src/content/paginas.gen.json');
const conteudo = existsSync(conteudoFile) ? JSON.parse(readFileSync(conteudoFile, 'utf8')) : [];
let leves = 0;
for (const p of conteudo) {
  const file = join(dist, `${p.path.replace(/^\//, '')}.html`);
  if (!existsSync(file)) {
    console.error(`postexport: a página ${p.path} não saiu no export (${file})`);
    process.exit(1);
  }
  const html = readFileSync(file, 'utf8');
  const leve = html
    .replace(/<script\b[^>]*\bsrc="\/_expo\/[^"]*"[^>]*><\/script>/g, '')
    .replace(/<link\b[^>]*\bhref="\/_expo\/static\/js\/[^"]*"[^>]*\/?>/g, '');
  writeFileSync(file, leve);
  leves++;
}
console.log(`postexport: ${leves} página(s) de conteúdo sem o JavaScript do app.`);
