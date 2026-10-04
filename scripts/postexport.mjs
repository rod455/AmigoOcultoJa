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
