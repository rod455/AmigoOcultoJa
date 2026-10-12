# Como medimos o Amigo Oculto Já!

Escrito em 11/10/2026, adaptando o guia "Como medimos o app" (de outra
empresa) ao que este produto é: grátis, sem assinatura, com a receita vindo
da comissão da Amazon. A regra geral do guia vale igual: **instrumento novo
só entra quando existe uma decisão que ele mudaria.**

## 1. As camadas, e de quem é cada número

| camada | quem escreve | onde |
|---|---|---|
| Comportamento | o site e os apps, por `track()` (`rpc_track`), sem nunca travar a tela | `public.events` |
| Fatos | o servidor, pelo próprio uso | `groups` (grupo sorteado), `participants.claimed_at` e `revealed_at`, `wish_items` (lista), `outbound_clicks` (toque para comprar), `auth.users` (contas) |
| Erros | o site e os apps, por `rpc_log_error` | `public.app_errors` |
| Fora daqui | Amazon Associados (vendas e comissão), Search Console, App Store Connect, Play Console | os painéis de cada um, por enquanto |

**Quando existe tabela com o fato, a tabela ganha do evento.** Para contar
grupos sorteados, use `groups`, não `draw_completed`. O evento serve para o
que não deixa rastro em lugar nenhum (quem começou e desistiu, por onde
mandou o convite).

## 2. Quem é a pessoa

- **`anon_id`**: código aleatório do aparelho (`aoj.anon_id`), criado antes
  de qualquer login, em todo evento. Não é a chave secreta de participação
  e não identifica ninguém fora daqui.
- **`user_id`**: a conta, carimbada pelo **servidor** a partir do login
  (`auth.uid()`), nunca enviada pelo aparelho.
- **Sem armazenamento** (aba anônima, WebView que não guarda): o aparelho
  grava `sem-armazenamento`, e o banco não conta isso como pessoa.
- **Uma régua só**: `analytics.identidade(anon_id, user_id)`. A view
  `analytics.eventos` costura: o aparelho que um dia entrou numa conta conta
  como essa conta também nos eventos de antes do login. Assim, quem começou
  no site e terminou no app é uma pessoa, não duas.

## 3. O que cada evento leva

| campo | o que é |
|---|---|
| `platform` | web, ios, android (edge/servidor para os do servidor) |
| `app_version`, `build` | `expo.version`; build nativo ou commit do site |
| `origin` | a tela, o botão ou o motivo (`lp_nav`, `painel`, `fora_amazon`...) |
| `utm` | a primeira chegada com sinal: campanha, `gclid`/`fbclid`, e o site que mandou a visita (`ref`: google.com.br, chatgpt.com, perplexity.ai). No Android, o referrer de instalação da Play |
| `profile` | `preview` em build de teste e em desenvolvimento: fica fora de toda leitura |

Vocabulário de campanha: tudo minúsculo, sem acento, palavras com hífen
(`src/lib/utm.ts` normaliza sozinho). Exemplo de link para post:
`https://amigoocultoja.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=natal-2026`.

## 4. O catálogo

`src/content/eventos.json` guarda cada evento com a **pergunta** que o fez
nascer, a **natureza** (`sessao` repete; `ato` é uma vez; `tecnico` mede o
app), a **unidade** (aparelho, conta, participante, grupo), o **desde** e,
quando há, uma **ressalva com data**.

Evento novo, no mesmo commit:

1. a linha no `eventos.json` (o `track()` não compila com nome fora dele);
2. `node scripts/catalogo-sql.mjs` colado numa migração nova;
3. o `track('nome', ...)` no código.

`tests/eventos.test.ts` reprova se o banco e o JSON divergirem, se um evento
do catálogo não for emitido por ninguém ou se o app emitir um evento do
servidor. A conferência foi provada plantando os dois defeitos.

## 5. Como ler (as portas únicas)

Tudo fica no schema `analytics`, fora da API pública. Leia pelo SQL Editor do
Supabase ou pelo n8n:

```sql
-- funil do organizador e do participante, com pessoas, aparelhos e contas lado a lado
select * from analytics.funil(now() - interval '7 days');
-- de onde vêm (primeira chegada por aparelho) e quantos começam um grupo
select * from analytics.origens(now() - interval '30 days');
-- erros por aparelho, com o total de aparelhos ativos no período
select * from analytics.erros(now() - interval '7 days');
```

Regras de leitura (do guia, todas válidas aqui):

- **Não divida degraus de unidades diferentes.** O funil diz a unidade de
  cada linha; `aparelho` sobre `grupo` não é taxa.
- **Janela antes do instrumento não é zero.** A coluna `janela_valida` diz se
  o período começa depois do `medido_desde` do degrau.
- **Antes de publicar um zero, pergunte quem escreve aquele número** e vá ver
  se o escritor existe (o evento está no código que está no ar? a versão
  do app já chegou aos aparelhos?).
- **Amostra pequena é direção, não lei.** Diga o absoluto junto com a taxa.
- **Alarme por aparelho, não por relato.** "22 erros" pode ser um aparelho em
  laço; `analytics.erros` traz o denominador.

## 6. A equipe fica de fora

Os nossos testes não podem virar "usuários". Cadastre a sua conta e a do
time uma vez:

```sql
insert into analytics.equipe (user_id, nome)
select id, 'Rodrigo' from auth.users where email = 'SEU_EMAIL_AQUI';
```

(ou `anon_id`, para um aparelho sem conta: está em `localStorage` como
`aoj.anon_id`, no site.)

## 7. O que não medimos ainda, e quando passa a valer

| o quê | por que ainda não |
|---|---|
| Experimentos A/B | sem volume: com dezenas de grupos, nenhuma diferença é legível. Entra quando houver uma aposta e centenas de grupos por semana |
| Coletor diário (n8n) e retrato diário | a temporada começa em novembro; vale ligar antes dela, com Search Console e Amazon. Pronto para montar quando você quiser |
| Retenção por coorte | o produto é sazonal (uma vez por ano); a pergunta certa é "quem organizou em 2026 volta em 2027" |
| Migalha do último passo (crash nativo) | os painéis das lojas cobrem crash nativo; erros de JavaScript já estão em `app_errors` |
| Aviso de "versão nova" no app | entra se alguém ficar muitas versões atrás; hoje cada versão passa pela loja |
