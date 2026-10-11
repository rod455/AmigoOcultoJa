# Versão 1.0 (primeira nas lojas)

**Árvore do build:** _(preencher com `git rev-parse --short HEAD` na hora do build)_
**Enviado à Apple em:** _(data do App Store Connect)_ · **à Play em:** _(data)_

## O que vai no binário

Tudo o que o site faz hoje (ver `src/content/site.json`), mais o que só existe no app:

- Entrar com Apple no iPhone (folha nativa). 11/10/2026.
- Excluir a conta pelo app (`/minha-conta`). 11/10/2026.
- Links de confirmação e de nova senha voltam para o app (`/auth`). 11/10/2026.
- Medição: aparelho, versão, campanha da Play e erros (`docs/dados/como-medimos.md`). 11/10/2026.

Plugins nativos tocados: `expo-apple-authentication`, `expo-application` (novos).

## Roteiro de aparelho (rodar no TestFlight e na faixa interna antes de promover)

Em cada um dos dois sistemas, com internet de celular e depois em Wi-Fi:

1. Abrir o app pela primeira vez: aparece a tela inicial com o logo, sem tela branca.
2. Criar um grupo com 4 nomes (o seu primeiro), valor R$ 50, e tocar em Sortear.
3. Na tela de conta: no iPhone aparecem Apple e Google; no Android, só Google. Entrar com Google: abre o navegador, volta para o app já logado e sorteia.
4. Sair (início › seu nome › Sair) e entrar de novo com e-mail e senha.
5. Criar conta nova por e-mail: o e-mail de confirmação, aberto no mesmo celular, abre o app e segue para o sorteio.
6. "Esqueci minha senha": o link abre o app na tela de nova senha.
7. No iPhone: entrar com Apple, escolhendo "ocultar meu e-mail".
8. Tela "pronto": o botão do WhatsApp abre o WhatsApp com a mensagem.
9. Abrir o link do convite em outro celular, escolher um nome, ver quem tirou, montar a lista com um item de cada tipo (sugestão, busca, link da Amazon, fora da Amazon) e tocar em comprar: abre a Amazon.
10. Painel: remover e adicionar uma pessoa.
11. Excluir a conta de teste em início › seu nome › Excluir. Os grupos continuam abrindo pelo link.
12. Conferir no banco: `select platform, app_version, build, count(*) from events where created_at > now() - interval '1 hour' group by 1, 2, 3;` mostra `ios` e `android` com a versão 1.0.0.

## Nota das lojas

**Português (até 500 caracteres, Play):**

> Organize o amigo oculto em minutos. Você digita os nomes, escolhe o valor do presente e sorteia. Cada pessoa recebe um link pelo WhatsApp, descobre quem tirou e monta uma lista com até 3 presentes. Ninguém vê o resultado dos outros, nem quem organiza. Dá para impedir que casais se tirem e para incluir ou tirar alguém depois do sorteio. Grátis.

**Inglês:**

> Organize your Secret Santa in minutes. Type the names, pick a gift budget and draw. Everyone gets a link on WhatsApp, finds out who they got and builds a wish list with up to 3 gifts. Nobody sees anyone else's result, not even the organizer. You can keep couples from drawing each other and add or remove people after the draw. Free.

## Respostas de privacidade

Conferidas contra `src/app/privacidade.tsx` e o banco em 11/10/2026. Mudou o
que se coleta, mude aqui, na política e no formulário das lojas no mesmo dia.

**App Store (App Privacy):** nada é usado para rastrear (tracking: não).

| dado | coletado | ligado à pessoa | para quê |
|---|---|---|---|
| Nome | sim | sim | funcionalidade do app |
| E-mail | sim | sim | funcionalidade do app |
| ID do usuário (conta) | sim | sim | funcionalidade do app, análise |
| ID do aparelho (código aleatório nosso, não o IDFA) | sim | sim | análise |
| Interações com o produto (eventos) | sim | sim | análise |
| Dados de falhas (erros de JavaScript) | sim | sim | funcionalidade do app |
| Outro conteúdo do usuário (nomes dos participantes, lista de presentes) | sim | sim | funcionalidade do app |

**Google Play (Segurança dos dados):** dados criptografados em trânsito: sim.
Exclusão: sim, pelo app e por `https://amigoocultoja.com.br/minha-conta`.
Coletados: nome, e-mail, IDs de usuário, interações no app, registros de
falhas, outros conteúdos gerados pelo usuário. Compartilhados com terceiros:
nenhum (os fornecedores que processam em nosso nome não contam como
compartilhamento). Finalidades: funcionalidade do app, análise, gerenciamento
da conta.

**Classificação etária:** sem conteúdo sensível; links para loja externa (Amazon).
**Público-alvo (Play):** maiores de 13 anos.
