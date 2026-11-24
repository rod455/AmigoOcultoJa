# Inventário de conteúdo do Amigo Oculto Já!

Situação em 24/11/2026: tudo o que foi escrito e publicado, onde está no site e de onde vem no repositório. Para a origem das ideias e as fontes de pesquisa, ver `docs/conteudo-e-pesquisa.md`.

## Resumo

| O quê | Quantidade |
|---|---|
| Páginas fixas do site (home, empresas, privacidade, termos, ajuda) | 5 |
| Páginas de conteúdo (guias) | 42, com cerca de 25.800 palavras |
| Perguntas de FAQ nas páginas de conteúdo | 165 |
| Perguntas de FAQ na home e em /empresas | 12 + 17 |
| Ferramentas no site | 1 (sorteador de nomes) |
| Endereços no sitemap | 47 |
| Arquivos para IAs | `llms.txt`, `llms-full.txt`, `empresas.md` |
| Fichas de loja | App Store e Google Play |
| Modelos de e-mail | 5 |

---

## 1. Páginas fixas do site

| Endereço | Título no Google | O que tem | Fonte do texto |
|---|---|---|---|
| `/` | Sorteio de Amigo Oculto Online e Grátis \| Amigo Oculto Já! | Formulário de criar grupo no topo, faixa "Quem será?", 3 passos, 8 fatos (preço, participantes, cadastro, sigilo…), comparação, 12 perguntas, rodapé com a linha "Guias" (13 links) | `src/content/site.json`, `src/features/landing/LandingPage.tsx` |
| `/empresas` | Amigo Secreto na Empresa: Sorteio Online Grátis \| Amigo Oculto Já! | Submarca azul. Resumo, 11 fatos, 6 dores da empresa, 3 passos, 3 perfis (RH, líder, comitê), 5 dicas, 17 perguntas para RH, TI e jurídico | `src/content/empresas.json`, `src/features/landing/EmpresasPage.tsx` |
| `/privacidade` | Política de Privacidade · Amigo Oculto Já! | Dados guardados, para quê, com quem, Google Analytics/Ads e Firebase, direitos | `src/app/privacidade.tsx` |
| `/termos` | Termos de Uso · Amigo Oculto Já! | Conta de quem organiza, participantes, links de presente, responsabilidades | `src/app/termos.tsx` |
| `/suporte` | Ajuda e suporte \| Amigo Oculto Já! | Problemas comuns (nome escolhido por engano, link, e-mail de confirmação, senha, exclusão da conta) e contato | `src/app/suporte.tsx` |

**Assinatura do site:** "A surpresa fica. A complicação sai."

**Resumo usado na home e nas IAs:** "O Amigo Oculto Já! é um site gratuito para fazer o sorteio do amigo oculto, também chamado de amigo secreto, pela internet. Quem organiza cadastra os nomes e o valor do presente, e o sistema sorteia. Cada participante recebe um link pelo WhatsApp, descobre quem tirou e monta uma lista com até 3 presentes."

**Perguntas da home (12):**
- É grátis mesmo?
- Como fazer o sorteio do amigo oculto online?
- Amigo oculto e amigo secreto são a mesma coisa?
- Precisa baixar alguma coisa ou criar conta?
- Quem organiza consegue ver quem tirou quem?
- Quantas pessoas podem participar?
- Dá para fazer amigo oculto à distância?
- E se alguém sair ou entrar depois do sorteio?
- Dá para impedir que casais se tirem?
- Posso pedir um presente que não está na Amazon?
- Alguém escolheu o meu nome por engano. E agora?
- Funciona para quem não tem WhatsApp?

**Perguntas de /empresas (17):**
- Como fazer o amigo secreto da empresa online?
- Quanto custa?
- Quantas pessoas podem participar?
- Dá para importar a planilha?
- Funciona no Slack, no Teams ou por e-mail?
- Dá para colocar o logo e as cores da empresa?
- Precisa instalar algo no computador da empresa?
- Dá para garantir que ninguém escolha o nome de outra pessoa?
- Quais dados dos funcionários vocês coletam?
- O RH vê quem tirou quem?
- Dá para evitar que certas pessoas se tirem?
- Dá para fazer o sorteio entre setores diferentes?
- Qual o valor ideal?
- Com quanta antecedência sortear?
- E se alguém entrar ou sair da empresa depois do sorteio?
- Como funciona para equipes remotas?
- A empresa pode pagar os presentes ou dar vale-presente?

---

## 2. Páginas de conteúdo (42)

Todas foram escritas por Paulo Silva e atualizadas em 06/11/2026; o sorteador, em 07/11/2026.

**Arquivos:** os textos ficam em `src/content/paginas/<slug>.md` e `src/content/paginas/presentes/<slug>.md`.

**O que toda página tem:**
- H1, data de atualização e autor;
- botão "Criar sorteio" no topo e no fim, levando a `/criar/nome`;
- FAQ;
- dados estruturados `Article`, `FAQPage` e `BreadcrumbList`.

As páginas abrem sem o JavaScript do app, por isso carregam rápido.

### 2.1 Sorteio e uso do produto (páginas de destino dos anúncios)

| Endereço | Título | Palavras | FAQ |
|---|---|---|---|
| `/sorteio-amigo-secreto` | Sorteio de amigo secreto online e grátis | 612 | 6 |
| `/amigo-secreto-online` | Amigo secreto online: como fazer grátis, mesmo a distância | 461 | 5 |
| `/amigo-secreto-pelo-whatsapp` | Amigo secreto pelo WhatsApp: como fazer o sorteio grátis | 424 | 5 |
| `/link-amigo-secreto` | Link de amigo secreto: como criar e mandar para o grupo | 384 | 4 |
| `/amigo-secreto-por-email` | Sorteio de amigo secreto por e-mail: como fazer | 368 | 4 |
| `/regras-amigo-secreto` | Regras do amigo secreto: número ímpar, casal e revelação | 523 | 5 |
| `/amigo-secreto-familia` | Amigo secreto de Natal em família: como organizar | 723 | 5 |
| `/amigo-secreto-empresa` | Amigo secreto da empresa: como organizar sem dor de cabeça | 499 | 4 |
| `/amigo-secreto-infantil` | Amigo secreto infantil: como fazer com crianças | 629 | 4 |

### 2.2 Variações da brincadeira

| Endereço | Título | Palavras | FAQ |
|---|---|---|---|
| `/amigo-secreto-diferente` | Amigo secreto diferente: 7 tipos e as regras de cada um | 621 | 4 |
| `/amigo-secreto-das-cores` | Amigo secreto das cores: regras, como fazer e ideias por cor | 581 | 5 |
| `/amigo-chocolate` | Amigo chocolate: regras, valor e ideias de presente | 662 | 4 |
| `/amigo-doce` | Amigo doce: como funciona e ideias de doce para dar | 662 | 4 |
| `/amigo-ladrao` | Amigo ladrão: regras, limite de roubos e presentes | 803 | 5 |
| `/amigo-da-onca` | Amigo da onça (inimigo secreto): regras e presentes | 566 | 4 |

### 2.3 Festa e revelação

| Endereço | Título | Palavras | FAQ |
|---|---|---|---|
| `/brincadeiras-amigo-secreto` | Brincadeiras de amigo secreto: 8 jogos para a festa | 823 | 4 |
| `/brincadeiras-de-natal` | Brincadeiras de Natal: 12 jogos para a família na ceia | 872 | 4 |
| `/brincadeiras-para-confraternizacao` | Brincadeiras para confraternização: 10 ideias para o time | 803 | 4 |
| `/como-revelar-amigo-secreto` | Como revelar o amigo secreto: 7 jeitos divertidos | 629 | 4 |
| `/frases-para-revelar-amigo-secreto` | Frases para revelar o amigo secreto: 40 ideias por ocasião | 763 | 3 |
| `/o-que-falar-no-amigo-secreto` | O que falar no amigo secreto: modelos para cada caso | 657 | 4 |
| `/mensagem-para-amigo-secreto` | Mensagem para amigo secreto: 40 modelos para o cartão | 715 | 4 |

### 2.4 Presentes

Os links de produto levam à busca da Amazon com o ID de associado `amigoocultoja-20`.

| Endereço | Título | Palavras | FAQ |
|---|---|---|---|
| `/presentes-amigo-secreto` | Presente de amigo secreto: ideias por valor e por perfil | 533 | 4 |
| `/lembrancinha-de-natal` | Lembrancinha de Natal: ideias baratas para muita gente | 707 | 3 |
| `/presentes/ate-30-reais` | Presente de amigo secreto até R$ 30: 12 ideias | 472 | 3 |
| `/presentes/ate-50-reais` | Presente de amigo secreto até R$ 50: 12 ideias | 473 | 3 |
| `/presentes/ate-100-reais` | Presente de amigo secreto até R$ 100: 12 ideias | 498 | 3 |
| `/presentes/ate-150-reais` | Presente de amigo secreto até R$ 150: 12 ideias | 485 | 3 |
| `/presentes/feminino` | Presente de amigo secreto feminino: 12 ideias que acertam | 485 | 3 |
| `/presentes/masculino` | Presente de amigo secreto masculino: 12 ideias que acertam | 470 | 3 |
| `/presentes/unissex` | Presente unissex de amigo secreto: 12 ideias que agradam | 475 | 3 |
| `/presentes/trabalho` | Presente de amigo secreto da firma: 12 ideias | 513 | 3 |
| `/presentes/o-que-pedir` | O que pedir no amigo secreto: 12 ideias por valor | 481 | 3 |

### 2.5 Comparações com concorrentes

Cada uma usa só o que está no site oficial do concorrente, com a data em que foi conferido.

| Endereço | Título | Palavras | FAQ |
|---|---|---|---|
| `/melhores-apps-amigo-secreto` | Sites e apps para sortear amigo secreto em 2026: comparativo | 906 | 4 |
| `/alternativa-drawnames` | DrawNames: como funciona e uma alternativa em português | 707 | 4 |
| `/alternativa-papelzinho` | Papelzinho amigo secreto: como funciona e alternativa | 607 | 4 |
| `/alternativa-app-sorteos` | App Sorteos amigo secreto: como funciona e alternativa | 734 | 4 |
| `/alternativa-happy-giftlist` | Happy Giftlist amigo secreto: como funciona e alternativa | 624 | 4 |

### 2.6 Nome e dados

| Endereço | Título | Palavras | FAQ |
|---|---|---|---|
| `/amigo-oculto-ou-amigo-secreto` | Amigo oculto ou amigo secreto? Diferença e mapa por estado | 543 | 4 |
| `/amigo-secreto-em-ingles` | Amigo secreto em inglês: Secret Santa e outros nomes | 604 | 4 |
| `/retrato-amigo-oculto-2026` | Retrato do Amigo Oculto 2026: o amigo secreto no Brasil | 1.131 | 4 |

O Retrato 2026 é um relatório de dados para jornalistas e IAs citarem. As fontes são Google Trends, Planejador de Palavras-chave, 600 vídeos do TikTok e buscas na Amazon. Em dezembro, ele deve ganhar os números agregados dos sorteios feitos no app.

### 2.7 Ferramenta

| Endereço | Título | Palavras | FAQ |
|---|---|---|---|
| `/sorteador-de-nomes` | Sorteador de nomes online e grátis | 572 | 4 |

**O que a ferramenta faz:**
- lista de nomes, um por linha;
- quantidade ou lista inteira;
- botões Sortear e Roleta;
- Copiar resultado, Sortear de novo e Tirar os sorteados da lista.

**Como funciona por dentro:** roda só no navegador, e nada é enviado nem guardado.
- Marcação: `src/content/ferramentas/sorteador-de-nomes.html`.
- Script: `public/ferramentas/sorteador-de-nomes.js`.
- Dados estruturados: `WebApplication`.

### 2.8 Autor

Paulo Silva, cadastrado em `src/content/autores.json`. A bio aparece no fim de cada página e no `Article`. A foto ainda não foi enviada, então aparecem as iniciais "PS".

---

## 3. Conteúdo para buscadores e IAs

| Arquivo | O que é |
|---|---|
| `public/llms.txt` (104 linhas) | Resumo do site para IAs: o que é, como funciona, fatos, links das páginas, incluindo os guias |
| `public/llms-full.txt` (239 linhas) | Versão completa: FAQs da home e de empresas e lista das páginas de conteúdo |
| `public/empresas.md` (120 linhas) | A página `/empresas` em Markdown, com link canônico para `/empresas` |
| `public/sitemap.xml` (47 endereços) | Páginas fixas + 42 guias. Gerado pelo `scripts/paginas.mjs` |
| `public/robots.txt` | Libera os robôs das IAs (GPTBot, ClaudeBot, PerplexityBot, Google-Extended e outros) nas páginas públicas e deixa os convites de fora |
| Dados estruturados | Home: Organization, WebSite, WebApplication, HowTo, FAQPage. Empresas: Service, HowTo, FAQPage. Guias: Article, FAQPage, BreadcrumbList. Sorteador: WebApplication |
| IndexNow | `scripts/indexnow.mjs` avisa Bing e Yandex a cada publicação |

---

## 4. Lojas de aplicativos

Os textos estão em `docs/lojas/app-store.md` e `docs/lojas/play-console.md`.

### App Store
- **Nome:** Amigo Oculto Já: Amigo Secreto.
- **Subtítulo:** Sorteio e lista de presentes.
- **Texto promocional:** "Organize o amigo oculto em minutos: cada um descobre quem tirou pelo WhatsApp e já monta a lista de presentes. Sem papelzinho e sem ninguém ver o resultado dos outros."
- **Palavras-chave:** natal, sortear, whatsapp, troca, familia, empresa, confraternizacao, festa, grupo, papelzinho, fim de ano.
- **Outros textos:** descrição (a mesma da Play), notas para o revisor e as novidades das versões 1.0 e 1.0.1 (`novidades-1.0.md`, `novidades-1.0.1.md`).

### Google Play
- **Nome:** Amigo Oculto Já: Amigo Secreto.
- **Descrição curta:** "Sorteio de amigo oculto e amigo secreto pelo WhatsApp. Sem papelzinho e grátis."
- **Outros textos:** descrição completa (Como funciona, recursos, privacidade) e respostas dos formulários da Play.

### Imagens das lojas (`docs/lojas/imagens/`)
- **iPhone:** 3 capturas por tamanho (6,3" e 6,9").
- **iPad:** 3 capturas de 13".
- **Play:** 3 capturas, destaque de 1024×500 e ícone de 512.

---

## 5. E-mails do login

Modelos em `scripts/email-templates.mjs`, com o logo de `public/email/`:

| E-mail | Assunto |
|---|---|
| Confirmação de cadastro | Confirme seu e-mail e sorteie o amigo oculto |
| Nova senha | Redefinir sua senha do Amigo Oculto Já! |
| Link de entrada | Seu link para entrar no Amigo Oculto Já! |
| Troca de e-mail | Confirme a troca de e-mail no Amigo Oculto Já! |
| Convite | Você foi convidado para o Amigo Oculto Já! |

---

## 6. Peças de marca e materiais

| Peça | Arquivo |
|---|---|
| Imagem de compartilhamento (1200×630) | `public/brand/og.jpg` |
| Arte "Quem será?" para redes | `public/brand/campanha-quem-sera.jpg` (original em `docs/marca/campanhas/`) |
| Logo das páginas de conteúdo | `public/brand/logo-360.webp` |
| Modelo de planilha para empresas | `public/modelos/amigo-secreto-empresa.xlsx` e `.csv` |
| Guia de marca, prancha, logos e símbolos | `docs/marca/` |

---

## 7. Documentos internos sobre conteúdo

| Arquivo | Assunto |
|---|---|
| `docs/conteudo-e-pesquisa.md` | De onde vieram as ideias, fontes e regras para páginas novas |
| `docs/mercado-e-features.md` | Pesquisa de mercado e concorrentes (15/10/2026) |
| `docs/marca.md` e `docs/marca/amigo-oculto-ja-marca.md` | Marca: voz, vocabulário, campanha |
| `docs/dados/marketing.md` | Tag do Google, eventos de campanha, Firebase e AdMob |
| `src/content/paginas/README.md` e `_modelo.md` | Como escrever e publicar uma página nova |

## 8. O que falta

- **Foto do Paulo:** colocar em `public/autores/paulo-silva.jpg` e preencher `foto` em `autores.json`.
- **Retrato 2026:** acrescentar em dezembro os dados agregados dos sorteios do app.
- **Páginas novas:** vêm por pull request do Paulo, depois que ele tiver acesso ao repositório.
- **AdSense:** pedir a aprovação agora que as páginas estão no ar e publicar o `ads.txt`.
