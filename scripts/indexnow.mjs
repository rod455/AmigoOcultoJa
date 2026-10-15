#!/usr/bin/env node
// Avisa Bing, Yandex e outros buscadores do protocolo IndexNow que as páginas
// do sitemap mudaram (o índice do Bing também alimenta a busca do ChatGPT e do
// Copilot). O Google não usa IndexNow: para ele, vale o sitemap no Search
// Console. Roda no fim do build e só na produção da Vercel; falha de rede
// nunca derruba o deploy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = '2b1830715a3467048561b13f8c050e0f'; // public/2b1830715a3467048561b13f8c050e0f.txt tem o mesmo valor (prova de que o site é nosso)
const HOST = 'amigoocultoja.com.br';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('indexnow: fora da produção, nada enviado');
  process.exit(0);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(10000),
  });
  console.log(`indexnow: ${urlList.length} páginas enviadas, resposta ${res.status}`);
} catch (e) {
  console.log(`indexnow: não enviado (${e instanceof Error ? e.message : e})`);
}
