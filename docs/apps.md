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

## 2. O que precisa existir antes do primeiro build (é com você)

Tudo com a conta principal **amigoocultoja@gmail.com**.

| conta | para quê | custo |
|---|---|---|
| **Expo** (expo.dev) | compilar, assinar, enviar e atualizar | grátis no começo (fila mais lenta) |
| **Apple Developer Program** | publicar no iPhone | US$ 99 por ano |
| **Google Play Console** | publicar no Android | US$ 25 uma vez |

Depois de criar a conta da Expo, crie o projeto em expo.dev (ou rode
`npx eas-cli@latest init` num computador) e me mande o **Project ID** (não é
segredo). Eu coloco no `app.json` e ligo o EAS Update.

Para eu disparar builds daqui sem computador seu, crie em expo.dev ›
Account settings › Access tokens um token e guarde como segredo
`EXPO_TOKEN` no ambiente desta sessão (nunca pelo chat). Sem isso, o build
sai pelo botão do expo.dev (GitHub conectado) ou pelo seu computador:

```bash
npx eas-cli@latest build --platform all --profile production   # .ipa e .aab
npx eas-cli@latest submit --platform all --profile production  # TestFlight e Play interna
```

No primeiro build de iPhone o EAS pede o login da Apple e cria sozinho o
certificado, o perfil e o App ID com Sign In with Apple e Associated Domains.
No Android, o EAS gera e guarda a chave de upload.

**Primeiro envio da Play é à mão**: a API do Google só aceita envio depois que
o app recebeu um primeiro .aab pelo Play Console. Baixe o .aab do expo.dev e
suba em Testes › Teste interno. Depois disso, `eas submit` resolve (com a
conta de serviço do Google cadastrada no expo.dev).

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
