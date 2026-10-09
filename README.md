# Amigo Oculto Já!

> A surpresa fica. A complicação sai.
>
> Marca e regras de uso em `docs/marca.md` (guia completo e arquivos originais em `docs/marca/`). O identificador técnico antigo (`tirei`) continua só em nomes internos, como o projeto Supabase e a pasta do repositório.

App do amigo oculto: o organizador cadastra os nomes, o app sorteia e gera um link para o grupo do WhatsApp. Cada participante abre o link, toca no próprio nome, descobre quem tirou e, na mesma tela, escolhe o próprio presente (com links de afiliado).

Este repositório tem **um código só** para web, iOS e Android (Expo + Expo Router). A versão web é a que está no ar para testes; os apps nativos saem do mesmo projeto com `eas build`.

Referências: a especificação de produto é o arquivo `tirei-spec-desenvolvimento.md` (fora do repo); a identidade visual está em `docs/marca.md`.

## Como está organizado

```
src/app/                 rotas (Expo Router)
  index.tsx              "/"  web: landing page · app: tela 1 (Início)
  app.tsx                "/app" tela 1 no web (para testar o protótipo)
  entrar.tsx             "Tenho um convite": cola o link ou código
  criar/nome.tsx         tela 2 · nome do grupo            (1/3)
  criar/pessoas.tsx      tela 3 · participantes            (2/3)
  criar/valor.tsx        tela 4 · valor, data, pares, Sortear (3/3)
  pronto/[codigo].tsx    tela 5 · sorteado → WhatsApp / copiar link
  painel/[codigo].tsx    tela 6 · painel do organizador (status, lembrar, liberar, remover, adicionar)
  g/[codigo].tsx         link do convite → telas 7, 8 e 9
  r/[id].tsx             redirecionador de afiliado (registra o clique)
src/features/            telas compostas (landing, start, participante, rascunho)
src/components/          UI (Screen, Button, Row, Sheet, ícones)
src/lib/                 api (RPCs/Edge Functions), device key, share (WhatsApp), analytics, formatação
src/theme/tokens.ts      cores, fontes (Figtree), medidas do sistema visual v2
supabase/migrations/     esquema, RLS e funções (0001_init.sql)
supabase/functions/      Edge Functions: draw_group (sorteio) e repair_group (remover/adicionar)
supabase/functions/_shared/draw.ts   algoritmo de sorteio (puro, testado)
tests/draw.test.ts       10.000 sorteios por cenário, distribuição, casos impossíveis, reparo
scripts/postexport.mjs   renomeia rotas dinâmicas do export estático para a Vercel
```

## Rodando

```bash
npm install
cp .env.example .env            # já vem preenchido com o projeto de testes
npm run web                     # http://localhost:8081
npm test                        # testes do sorteio (vitest)
npm run typecheck
npm run build                   # export estático em dist/ (o que a Vercel publica)
```

iOS / Android (Expo Go ou development build):

```bash
npx expo start                  # escaneie o QR com o Expo Go
npx eas-cli@latest build -p ios --profile preview   # quando for para as lojas
```

## Backend (Supabase)

Projeto `tirei` (região `sa-east-1`). Tudo que o cliente faz passa por **funções RPC `security definer`** ou pelas **Edge Functions**; nenhuma tabela é legível diretamente (RLS ligado sem policies, exceto `products`).

**Identidade.** Dois mecanismos convivem (migração `0002_auth.sql`):

- **Participante**: sem conta. Cada aparelho gera uma chave secreta (`device key`, 64 hex) guardada localmente; o banco só conhece o hash SHA-256. Assumir um nome vincula o nome à chave.
- **Organizador**: conta Supabase Auth (Google, Apple ou e-mail+senha; só nome e e-mail). O login acontece na hora de tocar em "Sortear" (tela `/conta`); todo o preenchimento anterior fica no rascunho local. O grupo guarda `owner_user_id` e `owner_key_hash`; `is_owner()` aceita qualquer um dos dois, então o organizador vê o painel e "Seus grupos" em qualquer aparelho logado. As Edge Functions leem o JWT do usuário no `Authorization`.

**Para ativar os logins no painel do Supabase** (Authentication → Providers / URL Configuration):

1. **Google**: criar OAuth Client ID (Web) no Google Cloud, colar client ID/secret no provider Google e adicionar `https://qqzlqnvreftablfyonux.supabase.co/auth/v1/callback` como redirect no Google.
2. **Apple**: Services ID + chave `.p8` no provider Apple (exige Apple Developer Program).
3. **URL Configuration**: Site URL `https://amigoocultoja.com.br`  e Redirect URLs `https://amigoocultoja.com.br/**`, `amigoocultoja://auth`. Sem isso o retorno do Google/Apple é recusado.
4. **E-mails com a marca**: os templates (confirmação, redefinir senha, link mágico, troca de e-mail, convite) estão em `supabase/templates/` e são gerados por `scripts/email-templates.mjs`. Para publicar no projeto com um comando (precisa de um token pessoal em supabase.com/dashboard/account/tokens):

   O Supabase só aceita templates personalizados com **SMTP próprio**. O mesmo comando configura o remetente:

   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_... \
   SMTP_HOST=smtp.gmail.com SMTP_PORT=587 SMTP_USER=voce@gmail.com SMTP_PASS=senha-de-app SMTP_FROM=voce@gmail.com SMTP_NAME="Amigo Oculto Já!" \
   node scripts/email-templates.mjs --push --site-url=https://amigoocultoja.com.br
   # acrescente --autoconfirm para desligar a confirmação de e-mail nos testes
   ```

   Para testes, Gmail com senha de app (myaccount.google.com/apppasswords, exige verificação em 2 etapas) funciona na hora. Para o lançamento, use Resend (`smtp.resend.com`, porta 465, usuário `resend`, senha = API key) ou Brevo, com o domínio verificado, e o remetente `oi@amigoocultoja.com.br`.

   Ou cole cada `.html` e o assunto (`.subject.txt`) em Authentication → Email Templates. As imagens da marca ficam em `public/email/` e são servidas pelo site (`/email/logo-dark.png`).
5. **E-mail**: funciona sem configuração. "Confirm email" vem ligado: o usuário recebe um link e, ao clicar, volta direto para o sorteio. Para testes rápidos, desligue "Confirm email" em Authentication → Providers → Email (ou configure um SMTP próprio: o remetente padrão tem limite baixo de envios por hora).

**Segredo do sorteio (P0-04).** `assignments` só é lida por `rpc_my_result`, que exige a chave do próprio participante. O organizador não tem nenhum privilégio extra: `rpc_panel` devolve apenas status (não abriu / entrou / viu / lista pronta). O teste em SQL (seção abaixo) tenta ler como `anon` e como organizador e precisa falhar.

| Função | Quem chama | O que faz |
|---|---|---|
| Edge `draw_group` | organizador | cria grupo + participantes + exclusões, sorteia e grava (service role) |
| Edge `repair_group` | organizador | remove/adiciona pessoa com reparo mínimo (spec §9.3) |
| `rpc_get_group` | qualquer um com o link | nome, valor, data, nomes e quem já entrou |
| `rpc_claim` | participante | vincula o nome ao aparelho (trava) |
| `rpc_my_result` | participante | quem eu tirei + lista dele + minha lista; marca `revealed_at` |
| `rpc_set_wish_items` | participante | salva até 3 itens (produto ou texto livre → link de busca com tag) |
| `rpc_suggestions` | participante | 6 produtos dentro do valor, vitrine varia por pessoa |
| `rpc_resolve_link` | qualquer um | registra `outbound_clicks` e devolve a URL de afiliado |
| `rpc_panel` / `rpc_release` / `rpc_my_groups` | organizador | painel, liberar nome, meus grupos |
| `rpc_nudge` | ambos | lembrete anônimo **in-app** (quem tirou → quem foi tirado; aparece no link da pessoa; 1 a cada 12 h) e registro do lembrete do organizador |
| `rpc_track` | ambos | eventos de analytics (`events`) |

Afiliados: a tag e os templates de busca ficam em `app_settings` (`affiliate_tag_amazon`, `search_url_amazon`, `default_store`). O catálogo inicial tem 24 produtos placeholder em `products`; substitua pelos links reais.

### Testes de segurança (rodar no SQL editor)

Os blocos `do $$ ... $$` usados na validação estão em `supabase/tests/` (RLS: nenhuma tabela legível por `anon`; ponta a ponta: claim, trava, segredo, lista, painel, sugestões, redirecionador, liberar).

### Observação sobre o deploy via MCP

O conector do Supabase trata as palavras `delete`/`revoke` como comandos destrutivos e aguarda confirmação. Por isso a função `rpc_set_wish_items` em produção executa o `delete` via `execute` de string e os `revoke` rodam dentro de `do $$ ... $$`. O arquivo `0001_init.sql` é a versão legível e equivalente; para aplicar via CLI (`supabase db push`) ele funciona como está.

## Deploy web (Vercel)

`vercel.json` já define build (`npm run build`), saída (`dist/`) e as rewrites das rotas dinâmicas (`/g/:codigo` etc.). As variáveis `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` e `EXPO_PUBLIC_BASE_URL` estão no `.env` versionado (são públicas por design), então a Vercel não precisa de nenhuma variável configurada no painel. `EXPO_PUBLIC_BASE_URL` fixa o domínio dos links de convite em `https://amigoocultoja.com.br`, mesmo quando o site é aberto em `tirei.vercel.app` ou numa preview.

Domínio `amigoocultoja.com.br`: DNS no Registro.br (modo avançado) com `A` na raiz para `216.198.79.1` e `CNAME www` para `cname.vercel-dns.com`. Nos apps, os Universal Links / App Links já estão declarados em `app.json` (falta publicar `apple-app-site-association` e `assetlinks.json`).

## O que ficou para depois (conforme a spec)

- Login do organizador (Apple/Google/WhatsApp OTP) e conversão da chave anônima em conta.
- Push (Expo Notifications), lembrete anônimo por push/WhatsApp com número, "Outro valor", importar contatos, modo TV.
- Catálogo via planilha + n8n, PostHog/Sentry (os eventos já são gravados em `events` com os nomes da spec §10).
- Termos de uso e política de privacidade (LGPD) antes do envio às lojas.
