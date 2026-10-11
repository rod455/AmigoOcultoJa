#!/usr/bin/env node
// Conferência antes do build dos apps. Roda sozinha no EAS (eas-build-pre-install)
// e à mão com `npm run conferir:app` (acrescente `-- --rede` para testar os endereços).
// Só usa o Node puro: no EAS ela roda antes do npm install.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// 1. Variáveis que vão embutidas no app: faltando, o app abre sem login nem dados
const env = Object.fromEntries(
  read('.env')
    .split('\n')
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, '')]),
);
const get = (k) => process.env[k] || env[k] || '';
for (const k of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_BASE_URL']) {
  if (!get(k)) errors.push(`${k} está vazia (.env ou variável do EAS)`);
}
// 2. Endereço final, sem salto: o apex é o principal e o www redireciona para ele
const base = get('EXPO_PUBLIC_BASE_URL');
if (base && base !== 'https://amigoocultoja.com.br') {
  errors.push(`EXPO_PUBLIC_BASE_URL deve ser https://amigoocultoja.com.br (sem www e sem barra), está "${base}"`);
}

// 3. Versão nova de verdade, no build que vai para as lojas
const app = JSON.parse(read('app.json')).expo;
const published = JSON.parse(read('docs/lojas/publicadas.json'));
const profile = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_APP_PROFILE || '';
const platform = process.env.EAS_BUILD_PLATFORM || '';
if (profile === 'production') {
  for (const p of platform ? [platform] : ['ios', 'android']) {
    if ((published[p] ?? []).includes(app.version)) {
      errors.push(`a versão ${app.version} já foi enviada para ${p}: suba expo.version no app.json`);
    }
  }
}

// 4. Opcional: os endereços respondem 200, sem redirecionamento
if (process.argv.includes('--rede')) {
  const checks = [
    [base, 200],
    [`${get('EXPO_PUBLIC_SUPABASE_URL')}/auth/v1/settings`, 200, { apikey: get('EXPO_PUBLIC_SUPABASE_ANON_KEY') }],
  ];
  for (const [url, want, headers] of checks) {
    try {
      const r = await fetch(url, { redirect: 'manual', headers });
      if (r.status !== want) errors.push(`${url} respondeu ${r.status} (esperado ${want}, sem salto)`);
    } catch (e) {
      errors.push(`${url} não respondeu: ${e.message}`);
    }
  }
}

if (errors.length) {
  console.error(`conferir:app reprovou:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`conferir:app ok · versão ${app.version}${profile ? ` · perfil ${profile}` : ''}${platform ? ` · ${platform}` : ''}`);
