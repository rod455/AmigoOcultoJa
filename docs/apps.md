# Os apps (iPhone e Android): como saem deste repositório

Escrito em 11/10/2026, a partir do guia "Como criamos os dois apps com Next.js,
Capacitor e Codemagic" (de outra empresa) e adaptado ao que este projeto é.

Em uma frase: **o site e os dois apps são o mesmo código Expo; o EAS (serviço
da Expo) compila os binários na nuvem, assina, manda para o TestFlight e para
a faixa interna da Play, e entrega correções de tela sem passar pela revisão
das lojas.**

## 1. O que aproveitamos do guia e o que não

O guia descreve um site Next.js empacotado pelo Capacitor e compilado no
Codemagic. Aqui o desenho é outro: as telas já são React Native de verdade,
e o Expo gera os projetos nativos sozinho. Por isso:

| do guia | aqui | por quê |
|---|---|---|
| Codemagic, `codemagic.yaml`, Mac mini | **EAS Build e EAS Submit** (`eas.json`) | é o caminho oficial do Expo; não precisa de Mac nem de yaml de máquina |
| empacotador `build-native.mjs`, lista `SO_NO_SITE`, `index.html` na raiz | não existe | não há export estático dentro do app; o app roda as telas nativas |
| versão em três lugares (`content.ts`, `build.gradle`, `pbxproj`) e `agvtool` | **um lugar só**: `expo.version` no `app.json` | as pastas `ios/` e `android/` são geradas a cada build (CNG) |
| contador de `versionCode` com piso no `gradle.properties` | **`appVersionSource: remote` + `autoIncrement`** | o EAS guarda e soma o número de build de cada loja; não há piso para manter |
| "mudança de tela exige build e revisão" | **EAS Update** (a ligar, seção 6) | correção de JavaScript chega aos aparelhos sem revisão; só mudança nativa pede build |
| `JA_PUBLICADAS` na conferência de versões | `docs/lojas/publicadas.json` + `scripts/conferir-app.mjs` | a Apple recusa versão repetida e a Play aceita e queima o número; a conferência barra antes |
| conferir variáveis embutidas e endereço sem salto | `scripts/conferir-app.mjs` (roda sozinho no EAS) | `EXPO_PUBLIC_BASE_URL` precisa ser o apex `https://amigoocultoja.com.br`, que não redireciona |
| ficha da versão com roteiro de aparelho antes do build | `docs/lojas/novidades-1.0.md` | "build sem roteiro não sai" vale igual |
| RevenueCat, AdMob, SDK do Facebook, Stripe, paywall | não se aplica | o app é grátis; a receita vem da comissão da Amazon, fora do app |
| perfil de provisionamento sem a capability do Sign In with Apple | o EAS sincroniza as capabilities do App ID a cada build | mesmo assim, o primeiro build de produção é o teste |
| client id do Google no `Info.plist` | não precisa | o login com Google abre o navegador do sistema pelo Supabase; não usa SDK nativo do Google |

## 2. A primeira subida (uma vez só, uns 30 minutos)

As contas da Apple e da Google Play já existem. Falta ligar a Expo a elas.
Tudo pelo navegador, sem instalar nada no seu computador.

### 2.1 Conta da Expo e o token do GitHub

1. Crie a conta em expo.dev com amigoocultoja@gmail.com.
2. Em expo.dev › Account settings › Access tokens, crie um token chamado
   `github-actions`. Copie (aparece uma vez só).
3. No GitHub, no repositório: Settings › Secrets and variables › Actions ›
   New repository secret. Nome `EXPO_TOKEN`, valor o token. Nunca mande o
   token pelo chat.

### 2.2 A sessão no Codespaces (o certificado da Apple nasce aqui)

O iPhone precisa de um certificado de distribuição criado com o seu login da
Apple (com o código de dois fatores). Isso não roda sozinho; é a única etapa
interativa. No GitHub, no repositório: botão verde **Code › Codespaces ›
Create codespace**. Abre um VS Code no navegador já com as dependências
instaladas. No terminal de baixo, um comando por vez:

```bash
npx eas-cli@latest login            # usuário e senha da Expo
npx eas-cli@latest init             # cria o projeto na Expo; responda Y
npx eas-cli@latest build -p ios --profile production --auto-submit
```

No último comando, responda:

- "Do you want to log in to your Apple account?" › **Y**, com o Apple ID da
  conta de desenvolvedor e o código de 6 dígitos.
- Tudo que perguntar sobre gerar certificado, perfil e bundle identifier ›
  **Y** (deixe o EAS gerar).
- No envio: se o app ainda não existe no App Store Connect, ele cria
  (nome "Amigo Oculto Já!"). Quando perguntar da **App Store Connect API
  Key**, deixe gerar uma nova: é ela que permite as próximas subidas
  sem ninguém digitar nada.

Depois, ainda no Codespaces:

```bash
npx eas-cli@latest build -p android --profile production
```

Se algum comando perguntar se pode fazer commit das mudanças, responda **Y**
(é o `app.json` com o ID do projeto). O Android gera a chave de assinatura sozinho. Pode fechar o Codespaces: os
builds continuam na nuvem da Expo (o do iPhone leva de 15 a 40 minutos na
fila grátis). **Me mande** (nenhum é segredo):

- o **Project ID** que o `init` mostrou (ou o link do projeto no expo.dev);
- o **Apple ID do app** (App Store Connect › o app › Informações do app ›
  "ID Apple", um número de 10 dígitos);
- o **Team ID** da Apple (developer.apple.com › Membership details).

### 2.3 O primeiro envio da Play é à mão

A API do Google só aceita envio automático depois que o app recebeu um
primeiro .aab pelo site:

1. Play Console › Criar app: nome "Amigo Oculto Já!", idioma português
   (Brasil), App, Gratuito.
2. Baixe o .aab do build Android no expo.dev (projeto › Builds ›
   Download).
3. Play Console › Testar e lançar › Teste interno › Criar versão › suba
   o .aab › Salvar e publicar para os testadores.
4. Para os próximos envios serem automáticos: crie uma conta de serviço do
   Google com acesso à Play (guia: https://expo.fyi/creating-google-service-account)
   e suba o arquivo JSON em expo.dev › projeto › Credentials › Android ›
   Google Service Account Key. O JSON não passa pelo chat.
5. Me mande o **SHA-256** da chave de assinatura (Play Console ›
   Configuração › Integridade do app › Assinatura de apps).

### 2.4 Daí em diante: um botão

Com o Project ID e o Apple ID do app no repositório (eu coloco), toda subida
é: GitHub › Actions › **Lojas (iPhone e Android)** › Run workflow (ou me
peça "sobe os apps"). Ele roda typecheck, testes e a conferência, compila os
dois e envia para o TestFlight e a faixa interna da Play.

## 3. Os perfis do `eas.json`

| perfil | para quê | instala como |
|---|---|---|
| `preview` | teste interno antes de mandar para a loja | Android: APK por link; iPhone: precisa registrar o aparelho (`eas device:create`), por isso preferimos o TestFlight |
| `production` | loja | .aab e .ipa; número de build somado sozinho |

Os builds `preview` marcam todo evento e erro com `profile = preview`, e
as leituras de medição deixam esses de fora (ver `docs/dados/como-medimos.md`).

## 4. O que o app tem de diferente do site (e por quê)

- **Entrar com Apple só no iPhone**, pela folha nativa. A App Store exige
  essa opção quando o app oferece Google (diretriz 4.8). Por isso, no iPhone,
  o botão do Google só aparece se o da Apple também estiver ligado.
  Para ligar: Supabase › Authentication › Providers › Apple › ativar e pôr
  `br.com.amigoocultoja.app` em **Client IDs**. Não precisa de chave secreta
  para o login nativo. No site e no Android o botão da Apple não aparece.
- **Excluir a conta** em `/minha-conta` (no app: toque no seu nome no
  início). A App Store (5.1.1(v)) e a Play exigem. No formulário de segurança
  de dados da Play, o "link para pedir exclusão" é
  `https://amigoocultoja.com.br/minha-conta`.
- **Links de e-mail voltam para o app**: confirmar conta e nova senha abrem
  `amigoocultoja://auth?code=...`, a rota `src/app/auth.tsx` troca o código
  pela sessão e segue para onde a pessoa estava. Essa URL já está na lista
  do Supabase (URL Configuration).
- **Criptografia**: `usesNonExemptEncryption: false` no `app.json` (só HTTPS),
  então o App Store Connect não pergunta nada a cada envio.
- **Idioma**: o app declara português do Brasil, então as janelas do sistema
  (login da Apple, compartilhar) aparecem em português.

## 5. Links universais (`/g/...` abrindo o app)

O `app.json` já declara `applinks:amigoocultoja.com.br` (iPhone) e o filtro
de `/g` com verificação (Android). Para valer, o site precisa servir dois
arquivos, que dependem de dados das contas:

- `public/.well-known/apple-app-site-association`: precisa do **Team ID** da
  Apple (Membership details no developer.apple.com).
- `public/.well-known/assetlinks.json`: precisa do **SHA-256 da chave de
  assinatura** (Play Console › Configuração › Integridade do app).

Me mande os dois (não são segredos) que eu publico. Até lá, o link do convite
abre no navegador, que é como funciona hoje.

## 6. O que precisa de build e o que não

| onde mora a mudança | precisa de build? |
|---|---|
| landing, páginas legais, `llms.txt` (site) | não, vai no push |
| banco, RPCs, edge functions, catálogo de presentes | não |
| textos e telas em `src/` | **com EAS Update: não** (sai em minutos); sem ele, sim |
| `app.json`, plugin ou biblioteca nativa nova, ícone, splash | sim, build e revisão |

**EAS Update**: depois do Project ID, eu instalo o `expo-updates`, ponho
`runtimeVersion: { policy: "appVersion" }` e um `channel` em cada perfil. A
partir daí, `npx eas-cli@latest update --channel production` manda correção
de tela para quem já tem o app. Quando mexer em algo nativo, sobe a versão e
faz build: aparelhos na versão velha nunca recebem JavaScript que exige
nativo novo.

## 7. O ritual de uma versão

1. Abrir `docs/lojas/novidades-<versão>.md` com o que entra (cada item com
   commit), a nota das lojas e o **roteiro de aparelho escrito antes do build**.
2. `npm run typecheck && npm test` e `npm run conferir:app`.
3. No momento do build, escrever na ficha o commit de onde ele saiu
   (`git rev-parse --short HEAD`). O que entrar depois é da próxima versão.
4. `eas build --profile production` e `eas submit`; rodar o roteiro no
   TestFlight e na faixa interna.
5. Promover nas lojas. Só então: acrescentar a versão em
   `docs/lojas/publicadas.json` e subir `expo.version` no `app.json` para a próxima.
6. Sobre um build que nenhum aparelho abriu, a resposta é "sem sinal ainda".
   O primeiro sinal é o roteiro no seu celular; o segundo é
   `analytics.funil()` mostrando sessões com a versão nova
   (`select app_version, platform, count(*) from events where name = 'session_started' group by 1, 2`).
