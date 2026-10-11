#!/usr/bin/env node
// Imprime o SQL que copia src/content/eventos.json para analytics.event_catalog.
// Evento novo: edite o JSON, rode `node scripts/catalogo-sql.mjs` e cole a saída
// numa migração nova. tests/eventos.test.ts reprova se o banco ficar para trás.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { eventos } = JSON.parse(fs.readFileSync(path.join(root, 'src/content/eventos.json'), 'utf8'));
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const rows = Object.entries(eventos).map(
  ([n, e]) => `  (${q(n)}, ${q(e.natureza)}, ${q(e.unidade)}, date ${q(e.desde)}, ${q(e.fonte)}, ${q(e.pergunta)}, ${q(e.ressalva ?? null)})`,
);
console.log(`insert into analytics.event_catalog (name, natureza, unidade, medido_desde, fonte, pergunta, ressalva) values
${rows.join(',\n')}
on conflict (name) do update set natureza = excluded.natureza, unidade = excluded.unidade, medido_desde = excluded.medido_desde,
  fonte = excluded.fonte, pergunta = excluded.pergunta, ressalva = excluded.ressalva;`);
