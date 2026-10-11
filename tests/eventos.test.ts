/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import catalog from '../src/content/eventos.json';

/**
 * A régua de eventos mora em três lugares: o catálogo (src/content/eventos.json),
 * o banco (analytics.event_catalog, pelas migrações) e quem emite (track() no
 * app, SQL e edge functions no servidor). Conferência que só olha a régua e
 * não olha quem usa a régua está cega: aqui as três pontas são comparadas.
 */
const root = path.resolve(__dirname, '..');
const eventos = catalog.eventos as Record<string, { natureza: string; unidade: string; desde: string; fonte: string; pergunta: string; ressalva?: string }>;

function walk(dir: string, exts: string[]): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p, exts);
    return exts.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

const appCode = walk(path.join(root, 'src'), ['.ts', '.tsx']).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const serverCode = [...walk(path.join(root, 'supabase'), ['.ts', '.sql'])].map((f) => fs.readFileSync(f, 'utf8')).join('\n');

/** Linhas do catálogo no banco, somando todas as migrações (a mais nova ganha). */
function catalogFromMigrations(): Map<string, string[]> {
  const rows = new Map<string, string[]>();
  const files = walk(path.join(root, 'supabase/migrations'), ['.sql']).sort();
  for (const f of files) {
    const sql = fs.readFileSync(f, 'utf8');
    const blocks = sql.split('insert into analytics.event_catalog').slice(1);
    for (const b of blocks) {
      const body = b.split(/\non conflict/)[0];
      const re = /\(\s*'([a-z_]+)',\s*'([a-z]+)',\s*'([a-z]+)',\s*date '(\d{4}-\d{2}-\d{2})',\s*'([a-z]+)'/g;
      for (const m of body.matchAll(re)) rows.set(m[1], [m[2], m[3], m[4], m[5]]);
    }
  }
  return rows;
}

describe('catálogo de eventos', () => {
  it('cada evento tem pergunta, natureza, unidade, data e fonte válidas', () => {
    for (const [name, e] of Object.entries(eventos)) {
      expect(name, name).toMatch(/^[a-z_]{3,60}$/);
      expect(['sessao', 'ato', 'tecnico'], name).toContain(e.natureza);
      expect(['aparelho', 'conta', 'participante', 'grupo'], name).toContain(e.unidade);
      expect(['app', 'servidor'], name).toContain(e.fonte);
      expect(e.desde, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.pergunta.length, name).toBeGreaterThan(15);
      // ressalva é afirmação sobre o mundo: sem data, envelhece sem ninguém ver
      if (e.ressalva) expect(e.ressalva, name).toMatch(/^\d{2}\/\d{2}\/\d{4}: /);
    }
  });

  it('o banco tem exatamente o mesmo catálogo (rode scripts/catalogo-sql.mjs numa migração nova)', () => {
    const db = catalogFromMigrations();
    const fromJson = new Map(Object.entries(eventos).map(([n, e]) => [n, [e.natureza, e.unidade, e.desde, e.fonte]]));
    expect([...db.keys()].sort()).toEqual([...fromJson.keys()].sort());
    for (const [n, v] of fromJson) expect(db.get(n), n).toEqual(v);
  });

  it('todo evento do app é emitido por um track() e todo evento do servidor por SQL ou edge function', () => {
    for (const [name, e] of Object.entries(eventos)) {
      if (e.fonte === 'app') {
        expect(appCode.includes(`track('${name}'`), `${name} não é emitido em src/`).toBe(true);
      } else {
        const emitted = serverCode.includes(`name: '${name}'`) || new RegExp(`values \\('${name}'`).test(serverCode);
        expect(emitted, `${name} não é emitido em supabase/`).toBe(true);
        expect(appCode.includes(`track('${name}'`), `${name} é do servidor e não pode sair do app`).toBe(false);
      }
    }
  });

  it('o app não emite nome fora do catálogo', () => {
    const used = new Set([...appCode.matchAll(/track\(\s*'([a-z_]+)'/g)].map((m) => m[1]));
    for (const n of used) expect(Object.keys(eventos), n).toContain(n);
  });
});
