#!/usr/bin/env node
// O .env não é versionado. No build (Vercel, Codemagic) e numa máquina nova,
// monta o .env a partir do .env.example, que tem só valores públicos (URL do
// Supabase, chave anon e domínio). Variáveis definidas no ambiente (painel da
// Vercel ou do Codemagic) valem sobre o arquivo: o Expo não sobrescreve o
// que já está no ambiente.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = path.join(root, '.env');
if (fs.existsSync(env)) {
  console.log('env: .env já existe');
} else {
  fs.copyFileSync(path.join(root, '.env.example'), env);
  console.log('env: .env criado a partir do .env.example');
}
