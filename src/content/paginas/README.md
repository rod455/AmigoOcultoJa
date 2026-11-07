# Páginas de conteúdo

Cada arquivo `.md` desta pasta vira uma página estática do site:

- `src/content/paginas/<slug>.md` → `amigoocultoja.com.br/<slug>`
- `src/content/paginas/presentes/<slug>.md` → `amigoocultoja.com.br/presentes/<slug>`

O formato está em `_modelo.md` (arquivos com `_` no começo não são publicados).
O build (`scripts/paginas.mjs`) confere o cabeçalho e para com uma mensagem
clara se faltar algo; ele também atualiza `public/sitemap.xml`, o `llms.txt` e,
na publicação, avisa o Bing pelo IndexNow.

Cada página sai com: título (H1) e data de atualização, autor com foto e bio
(`src/content/autores.json`), botão "Criar sorteio" no topo e no fim, FAQ com
dado estruturado `FAQPage`, `Article` com autor e data, e `title`,
`description` e `canonical`. A página vai sem o JavaScript do app: só texto e
links, para abrir rápido.

## Página com ferramenta

Uma página pode ter uma ferramenta que roda no navegador, como o sorteador de
nomes (`sorteador-de-nomes.md`):

- no cabeçalho, `ferramenta: <nome>`;
- no texto, a linha `{{ferramenta}}`, sozinha, onde a ferramenta deve aparecer;
- a marcação fica em `src/content/ferramentas/<nome>.html` e o script em
  `public/ferramentas/<nome>.js` (sem o JavaScript do app; os estilos ficam em
  `src/app/+html.tsx`).

A página ganha também o dado estruturado `WebApplication`.
