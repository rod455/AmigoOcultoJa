#!/usr/bin/env node
// Gera public/llms.txt, public/llms-full.txt e public/empresas.md a partir de
// src/content/site.json e src/content/empresas.json
// (formato https://llmstxt.org). Roda antes do export no `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(fs.readFileSync(path.join(root, 'src/content/site.json'), 'utf8'));
const empresas = JSON.parse(fs.readFileSync(path.join(root, 'src/content/empresas.json'), 'utf8'));
// páginas de conteúdo, geradas por scripts/paginas.mjs (roda antes no build)
const conteudoFile = path.join(root, 'src/content/paginas.gen.json');
const conteudo = fs.existsSync(conteudoFile) ? JSON.parse(fs.readFileSync(conteudoFile, 'utf8')) : [];

const pages = [
  [`${site.url}/`, 'Início', 'O que é, como funciona, perguntas frequentes e o formulário para criar um grupo.'],
  [`${site.url}${empresas.path}`, 'Amigo secreto na empresa', 'Para RH, líderes de time e comitês de confraternização: como organizar o amigo secreto corporativo, equipes remotas, dados (LGPD) e perguntas de empresas.'],
  [`${site.url}${empresas.path}.md`, 'Amigo secreto na empresa (Markdown)', 'A mesma página de empresas em texto puro, com todas as perguntas frequentes.'],
  [`${site.url}${empresas.path}/importar`, 'Cadastro da empresa', 'Onde a empresa cria o amigo secreto: planilha ou nomes digitados, dinâmica (um grupo por área, integração entre áreas ou todos juntos), valor e sorteio.'],
  [`${site.url}/privacidade`, 'Política de Privacidade', 'Quais dados o site guarda, para que usa, com quem compartilha e como pedir exclusão (LGPD).'],
  [`${site.url}/termos`, 'Termos de Uso', 'Regras de uso para quem organiza e para quem participa, presentes e lojas parceiras.'],
  [`${site.url}/suporte`, 'Ajuda e suporte', 'Contato e soluções para os problemas mais comuns: link, nome escolhido por engano, e-mail de confirmação, senha e exclusão da conta.'],
  ...conteudo.map((p) => [`${site.url}${p.path}`, p.title, p.description]),
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

## Para empresas

${empresas.summary}

${empresas.facts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Como a empresa organiza:

${empresas.steps.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join('\n')}

## Páginas

${pages.map(([u, t, d]) => `- [${t}](${u}): ${d}`).join('\n')}

## Mais detalhes

- [Versão completa para assistentes de IA](${site.url}/llms-full.txt): todas as perguntas frequentes.

Contato: ${site.email}
`;

const faq = site.faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n');
const faqEmpresas = empresas.faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n');
const tips = empresas.tips.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join('\n');
const full = `${short}
## Perguntas frequentes

${faq}

## Perguntas de empresas (RH, TI e jurídico)

${faqEmpresas}

## Como organizar o amigo secreto da empresa

${tips}

## O que o site não faz

- Não mostra a ninguém o resultado de outra pessoa, nem para quem organiza.
- Não pede CPF, telefone, endereço nem dados de pagamento.
- Não vende produtos: os presentes são comprados nas lojas, pelos links.
- Não é preciso instalar aplicativo para participar.
`;

// a página /empresas em Markdown (link rel="alternate" na própria página)
const md = (pairs) => pairs.map(([t, d]) => `- **${t}:** ${d}`).join('\n');
const empresasMd = `# ${empresas.metaTitle.replace(/ \| .*$/, '')}

> ${empresas.summary}

Página: ${site.url}${empresas.path} · Atualizada em ${empresas.updated.split('-').reverse().join('/')} · Criar o amigo secreto da empresa: ${site.url}${empresas.path}/importar

## Em resumo

${md(empresas.facts)}

## Como funciona

${empresas.steps.map(([t, d], i) => `${i + 1}. **${t}.** ${d}`).join('\n')}

## O que costuma dar errado, e como o site resolve

${md(empresas.pains)}

## Quem organiza

${md(empresas.roles)}

## Guia rápido: como organizar o amigo secreto da empresa

${empresas.tips.map(([t, d], i) => `${i + 1}. **${t}.** ${d}`).join('\n')}

## Perguntas frequentes

${faqEmpresas}

Contato para empresas: ${site.email}
`;

fs.writeFileSync(path.join(root, 'public/llms.txt'), short);
fs.writeFileSync(path.join(root, 'public/empresas.md'), empresasMd);
fs.writeFileSync(path.join(root, 'public/llms-full.txt'), full);
console.log('llms: public/llms.txt, public/llms-full.txt e public/empresas.md gerados');
