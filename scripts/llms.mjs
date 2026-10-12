#!/usr/bin/env node
// Gera public/llms.txt e public/llms-full.txt a partir de src/content/site.json
// (formato https://llmstxt.org). Roda antes do export no `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(fs.readFileSync(path.join(root, 'src/content/site.json'), 'utf8'));

const pages = [
  [`${site.url}/`, 'Início', 'O que é, como funciona, perguntas frequentes e o formulário para criar um grupo.'],
  [`${site.url}/privacidade`, 'Política de Privacidade', 'Quais dados o site guarda, para que usa, com quem compartilha e como pedir exclusão (LGPD).'],
  [`${site.url}/termos`, 'Termos de Uso', 'Regras de uso para quem organiza e para quem participa, presentes e lojas parceiras.'],
  [`${site.url}/suporte`, 'Ajuda e suporte', 'Contato e soluções para os problemas mais comuns: link, nome escolhido por engano, e-mail de confirmação, senha e exclusão da conta.'],
];

const facts = site.facts.map(([k, v]) => `- ${k}: ${v}`).join('\n');
const steps = site.steps.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join('\n');

const short = `# ${site.name}

> ${site.summary}

${site.tagline}

Idioma: português do Brasil. Público: famílias, amigos e equipes de trabalho no Brasil. "Amigo oculto" e "amigo secreto" são nomes da mesma brincadeira.

## Fatos

${facts}

## Como funciona

${steps}

## Páginas

${pages.map(([u, t, d]) => `- [${t}](${u}): ${d}`).join('\n')}

## Mais detalhes

- [Versão completa para assistentes de IA](${site.url}/llms-full.txt): todas as perguntas frequentes.

Contato: ${site.email}
`;

const faq = site.faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n');
const full = `${short}
## Perguntas frequentes

${faq}

## O que o site não faz

- Não mostra a ninguém o resultado de outra pessoa, nem para quem organiza.
- Não pede CPF, telefone, endereço nem dados de pagamento.
- Não vende produtos: os presentes são comprados nas lojas, pelos links.
- Não é preciso instalar aplicativo para participar.
`;

fs.writeFileSync(path.join(root, 'public/llms.txt'), short);
fs.writeFileSync(path.join(root, 'public/llms-full.txt'), full);
console.log('llms: public/llms.txt e public/llms-full.txt gerados');
