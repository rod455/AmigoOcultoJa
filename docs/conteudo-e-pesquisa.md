# Conteúdo e pesquisa: o que fizemos e de onde vieram as ideias

Resumo de 22/11/2026. Junta o que está no repositório sobre a marca, a pesquisa de mercado e a produção das páginas de conteúdo. Os detalhes ficam nos arquivos citados em cada seção.

## 1. Linha do tempo

| Data | O que aconteceu | Onde está |
|---|---|---|
| 09/10/2026 | Marca aprovada: direção **Segredo simpático**, nome **Amigo Oculto Já!**, assinatura "A surpresa fica. A complicação sai." O nome anterior, "Tirei!", foi abandonado. | `docs/marca.md`, `docs/marca/` |
| 11/10/2026 | Primeira rodada de SEO e GEO (otimização para IAs) no site: dados estruturados, `llms.txt`, títulos e textos para IAs. | commit `742757f` |
| 12/10/2026 | Textos das lojas. Na Play, o nome ganhou "amigo secreto" para aparecer na busca. | `docs/lojas/` |
| 15/10/2026 | Pesquisa de mercado (concorrentes, features, o que a empresa procura) e página `/empresas` com a submarca azul. | `docs/mercado-e-features.md` |
| 25/10/2026 | Plano de marketing do Paulo para a temporada. Entraram a tag do Google, o aviso de cookies e o molde das páginas de conteúdo. | `docs/dados/marketing.md`, `src/content/paginas/README.md` |
| 06/11/2026 | 41 páginas de conteúdo escritas pelo Paulo, mais o rodapé "Guias" na home. | `src/content/paginas/` |
| 07/11/2026 | Sorteador de nomes (página com ferramenta). Os números de busca saíram do texto das páginas. | `src/content/paginas/sorteador-de-nomes.md`, `public/ferramentas/` |

## 2. Marca

**De onde veio.** A identidade saiu do briefing do produto e de uma proposta visual aprovada pelo Luiz: dois papelzinhos sobrepostos, com uma faixa de olhos e uma piscadinha no papel vermelho. A prancha aprovada está em `docs/marca/referencia/prancha-aprovada.png`. O repositório guarda só o resultado (guia, prancha e kit). A pesquisa visual que levou a essa direção não está aqui.

**O que a marca diz** (`docs/marca/amigo-oculto-ja-marca.md`):
- **Propósito:** facilitar a organização do amigo oculto e a escolha de presentes, preservando a surpresa.
- **Posicionamento:** um jeito simples, leve e brasileiro de organizar o amigo oculto da família, dos amigos ou da equipe.
- **Promessa:** menos trabalho para organizar, mais espaço para a surpresa.
- **Voz:** direta, simpática, confiável e brasileira. "Bora?", "Pronto!", "quem você tirou", "lista de presentes".
- **Vocabulário:** grupo (não sala), lista de presentes (não wishlist), quem organiza (não admin).
- **Campanha de fim de ano:** "Quem será?" / "Seu amigo oculto começa aqui." / "Criar meu grupo". Nada de gorro ou árvore no símbolo.
- **Submarca Empresas:** o mesmo símbolo em azul (`#1F4BB8`), usado só em `/empresas`.

**Regra que vale para todo texto:** só divulgar o que o produto faz de verdade. "Sem cadastro", por exemplo, vale só para quem participa, porque quem organiza cria conta na hora de sortear.

## 3. Pesquisa de mercado (15/10/2026)

Arquivo: `docs/mercado-e-features.md`. Foi feita com buscas na web, e cada dado tem o link da fonte.

**Concorrentes olhados:** amigosecreto.com.br, Migo Secreto, Gifwe, Papelzinho, Amigo Secreto 22, Meu Amigo Oculto, Elfster/secretsanta.com, DrawNames, Giftster, Trivia e Smarter Secret Santa (Slack e Teams), além de Snappy, Giftogram, Pluxee e Ticket (presentes corporativos).

**Fontes usadas:**
- **Listas "melhores sites e apps de amigo secreto":** Olhar Digital, Canaltech, Mobills, Tecnoblog, TecMundo, Buscapé.
- **Lojas:** ficha do Papelzinho na App Store.
- **Dados de participação e valor:** pesquisa CNDL/SPC Brasil sobre o Natal de 2025, via Diário do Comércio. Mostra que 28% fazem amigo secreto no trabalho e que o presente médio é de cerca de R$ 72.
- **Empresas e RH:** Citation HR (pressão social), blog do Elfster (grupos grandes), GiftList (equipes remotas), blog da Pluxee (vale-presente).

**O que a pesquisa trouxe:**
- As listas brasileiras de melhores apps citam sempre os mesmos 6 ou 7 nomes, e nós não aparecíamos. As IAs tendem a responder com base nessas listas (isso é inferência nossa).
- Lista de features em ordem de impacto. A maioria virou produto em 15/10: proteção do nome (convite individual), vale-presente na lista, entrega para remotos e modo empresa (planilha e painel do RH).
- Não encontramos serviço brasileiro que junte sorteio, vale-presente e painel do RH.

## 4. Páginas de conteúdo

### Como funciona
- **Arquivos:** cada `src/content/paginas/<slug>.md` vira `amigoocultoja.com.br/<slug>`, e os de `presentes/` viram `/presentes/<slug>`. O formato está em `src/content/paginas/_modelo.md` e `README.md`.
- **Cabeçalho:** `title`, `description`, `slug`, `updated`, `author` e `faq`. O build (`scripts/paginas.mjs`) confere tudo e para se faltar algo.
- **O que cada página leva:** H1, data, autor (Paulo Silva, em `src/content/autores.json`), botão "Criar sorteio" no topo e no fim, FAQ, e dados estruturados `Article`, `FAQPage` e `BreadcrumbList`.
- **Sem o JavaScript do app:** a página abre rápido. A exceção é o sorteador de nomes, que carrega só o script da própria ferramenta (`ferramenta:` no cabeçalho).
- **Divulgação automática:** cada página nova entra sozinha no `sitemap.xml` e no `llms.txt`. A cada publicação, o IndexNow avisa o Bing.

### O que foi publicado (42 páginas)
- **Ligadas aos anúncios:** sorteio de amigo secreto, amigo secreto online, pelo WhatsApp, link e melhores apps.
- **Variações da brincadeira:** amigo chocolate, doce, ladrão, da onça, das cores, diferente, infantil, em família, por e-mail e em inglês.
- **Festa:** brincadeiras de amigo secreto, de Natal e para confraternização; como revelar; frases; o que falar; mensagens para o cartão; regras.
- **Presentes:** ideias gerais, lembrancinha de Natal e 9 guias em `/presentes/` (até R$ 30, 50, 100 e 150; feminino, masculino, unissex, trabalho e o que pedir). Os links da Amazon levam o nosso ID `amigoocultoja-20`.
- **Comparações honestas:** alternativas ao DrawNames, Papelzinho, App Sorteos e Happy Giftlist. Usam só o que está no site oficial de cada um, com a data em que foi conferido.
- **Dados:** Retrato do Amigo Oculto 2026, um relatório feito para jornalistas e IAs citarem.
- **Ferramenta:** sorteador de nomes.
- **Nome da brincadeira:** amigo oculto ou amigo secreto (mapa por estado).

### Onde o Paulo pesquisou

| Fonte | Para quê |
|---|---|
| Google Trends | Curva da busca por "amigo secreto" (pico de 30/11 a 20/12 em 2025) e o mapa de "amigo oculto × amigo secreto" por estado |
| Planejador de Palavras-chave do Google | Volume de busca de cada tema, para escolher quais páginas fazer. **Fica fora do texto das páginas** (ver seção 5) |
| TikTok | 600 vídeos de #amigosecreto, #amigooculto, #presenteamigosecreto e #amigosecretodascores (295 em português), coletados em 25/10/2026: tendências como o amigo secreto das cores e os cenários mais comuns |
| Amazon (amazon.com.br) | Primeira página de 12 buscas, em 25/10 e 06/11/2026, para faixas de preço e ideias de presente |
| CNDL/SPC Brasil (via Diário do Comércio) | Quem participa, com quem e o valor médio do presente |
| Wikipédia (português e inglês) | Definição do amigo secreto e nomes em outros países |
| Sites oficiais dos concorrentes | DrawNames, Papelzinho, App Sorteos, Happy Giftlist, Migo Secreto, amigosecreto.com.br, Wishes |
| Imprensa e blogs | Regras das variações, que não têm regra oficial. Ver a tabela abaixo |

**Sites citados nas páginas** (fora Amazon e Shopee):

| Site | Páginas |
|---|---|
| diariodocomercio.com.br | amigo-secreto-familia, brincadeiras-para-confraternizacao, lembrancinha-de-natal, o-que-falar-no-amigo-secreto |
| portalamazonia.com | amigo-chocolate, brincadeiras-amigo-secreto, brincadeiras-de-natal, como-revelar-amigo-secreto |
| opovo.com.br | brincadeiras-de-natal, brincadeiras-para-confraternizacao, como-revelar-amigo-secreto |
| catracalivre.com.br | amigo-doce, brincadeiras-amigo-secreto, como-revelar-amigo-secreto |
| oimparcial.com.br | amigo-ladrao, brincadeiras-amigo-secreto, como-revelar-amigo-secreto |
| cnnbrasil.com.br | amigo-ladrao, amigo-secreto-diferente, brincadeiras-amigo-secreto |
| dci.com.br | amigo-chocolate, amigo-doce, amigo-secreto-diferente |
| auditorioibirapuera.com.br | amigo-ladrao, amigo-secreto-diferente |
| pt.wikipedia.org, en.wikipedia.org | amigo-oculto-ou-amigo-secreto, regras-amigo-secreto, amigo-secreto-em-ingles |
| agendor.com.br, bnewssaopaulo.com.br | brincadeiras-para-confraternizacao, brincadeiras-de-natal |
| nsctotal.com.br, band.com.br, diariodopara.com.br | amigo-da-onca |
| mobills.com.br | amigo-ladrao |

A pesquisa bruta do Paulo (planilhas de volume de busca e a coleta do TikTok) fica com ele, fora do repositório. O plano da temporada foi enviado por ele em 25/10/2026.

## 5. Regras para escrever páginas novas

- **Abra com a resposta.** O primeiro parágrafo, em negrito, responde a pergunta do título em 2 ou 3 frases.
- **Sem número de busca no texto.** Volume do Planejador, "X mil buscas" e monitor de IA são dados internos da pesquisa, não texto para o cliente. Saíram de 35 páginas em 07/11/2026. Exceções: o mapa por estado (o assunto de `/amigo-oculto-ou-amigo-secreto`) e o Retrato 2026, que é um relatório de dados.
- **Fonte com link** para todo dado e toda regra tirada de outro site, com a data da consulta no "Sobre este guia".
- **Concorrente:** só o que está no site oficial, com a data. Nada de opinião sem base.
- **Só prometa o que o app faz.** Se o texto descreve um recurso, confira no app antes.
- **Voz da marca:** "quem você tirou", "lista de presentes", "quem organiza". "Amigo secreto" e "amigo oculto" aparecem os dois, porque as pessoas buscam pelos dois.
- **Data no futuro não vale** no campo `updated`: ela aparece na página e vai para o Google.
- **Como entregar:** as próximas páginas vêm por pull request, com o build (`npm run export:web`) passando.

## 6. Para as IAs (GEO)

- **Resumos para IAs:** `public/llms.txt` e `llms-full.txt`, gerados por `scripts/llms.mjs` e incluindo as páginas de conteúdo. Também existe `/empresas.md`, a página de empresas em Markdown.
- **robots.txt:** libera os robôs das IAs (GPTBot, ClaudeBot, PerplexityBot e outros) nas páginas públicas e deixa os convites de fora.
- **Dados estruturados** em todas as páginas públicas. O sorteador também tem `WebApplication`.
- **Buscadores:** Search Console (Google) e IndexNow (Bing e Yandex). O cadastro no Bing Webmaster Tools está no plano do Paulo.
- **Maior gargalo apontado em 15/10:** entrar nas listas brasileiras de melhores apps, que as IAs usam como fonte. A página `/melhores-apps-amigo-secreto` é a nossa versão dessa comparação.

## 7. Medição

- **Eventos do site e do app:** como são gravados e o que significa cada um está em `docs/dados/como-medimos.md`.
- **Campanha (GA4, Google Ads e Firebase):** eventos e IDs em `docs/dados/marketing.md`. O sorteador envia `sorteador_usado` quando a tag do Google está ligada.
- **Visitas vindas de IAs** (chatgpt.com, perplexity.ai, gemini.google.com) aparecem pela origem da sessão (`session_started`).
