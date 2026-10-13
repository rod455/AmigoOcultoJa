# Os apps (iPhone e Android): como saem deste repositório

Atualizado em 12/10/2026. Os builds rodam no **Codemagic**, como nos outros
apps da casa (guia "Como criamos os dois apps com Next.js, Capacitor e
Codemagic"). O que muda aqui é o empacotamento: o app é **Expo**, não Capacitor.

Em uma frase: **o site e os dois apps são o mesmo código Expo; a cada build o
Codemagic gera os projetos nativos a partir do `app.json` (`expo prebuild`),
compila, assina e entrega no TestFlight e na faixa interna da Play; a
promoção para produção é um clique no console de cada loja.**

## 1. O que muda em relação ao guia do Capacitor

| no guia (Capacitor) | aqui (Expo) |
|---|---|
| `scripts/build-native.mjs`, `SO_NO_SITE`, `index.html` na raiz | não existe: o app roda telas nativas, não um site empacotado |
| pastas `ios/` e `android/` versionadas, editadas no Xcode e no Gradle | **geradas a cada build** (`npx expo prebuild`) e fora do git. Mudança nativa vai no `app.json`; nunca edite as pastas geradas |
| versão em três lugares (`content.ts`, `build.gradle`, `pbxproj`) | **um lugar**: `expo.version` no `app.json`. Quando uma loja anda na frente da outra, `expo.android.version` ou `expo.ios.version` vale sobre ela (ex.: Android 1.0.1 enquanto o iPhone 1.0.0 está na revisão). A medição lê a versão gravada no binário |
| piso de `versionCode` no `gradle.properties` | o passo do yaml pergunta à loja o último número e soma 1, nunca abaixo do contador do Codemagic; vira `APP_BUILD_NUMBER`, que o `app.config.js` aplica no `prebuild`. A linha `versionCode deste envio: N` no log é a fonte que vale |
| `agvtool new-version` | o mesmo mecanismo acima vira o `CFBundleVersion` |
| `keystore.properties` escrito no CI | o Gradle recebe a assinatura por `-Pandroid.injected.signing.*`, as mesmas variáveis `CM_KEYSTORE_*` |
| `scripts/ios-google-scheme.mjs` | não precisa: o login com Google abre o navegador pelo Supabase, sem SDK nativo |
| RevenueCat, AdMob, SDK do Facebook | não se aplica |
| grupo de variáveis com `NEXT_PUBLIC_*` | as `EXPO_PUBLIC_*` não são segredo e vêm do `.env` do repositório; o painel só guarda o que é segredo |

O que vem igual do guia: os três workflows (`lojas`, `ios-testflight`,
`android-play`), o Android antes do iPhone no `lojas`, **a conferência das
capabilities do perfil antes do archive** (Sign In with Apple e Associated
Domains), o erro real do `xcodebuild` impresso quando o archive falha, a lista
de versões já publicadas (`docs/lojas/publicadas.json`, conferida por
`scripts/conferir-app.mjs`) e o ritual de versão da seção 7.

## 2. Configuração no painel do Codemagic (uma vez)

Os nomes abaixo precisam bater exatamente com o `codemagic.yaml`.

### 2.1 App
Codemagic › **Add application** › GitHub › `rod455/AmigoOcultoJa` ›
tipo **React Native** (ou "Other") › ele encontra o `codemagic.yaml` no
branch `main`.

### 2.2 Integração App Store Connect: `asc-amigoocultoja`
1. App Store Connect › **Usuários e acesso › Integrações › App Store Connect
   API** › chave de **equipe** › gerar, com acesso **App Manager**. Anote o
   **Issuer ID** e o **Key ID** e baixe o `.p8` (só baixa uma vez).
2. Codemagic › Team settings › **Integrations › Developer Portal › Manage
   keys** › adicionar com o nome `asc-amigoocultoja`, o Issuer ID, o Key ID e
   o `.p8`.

### 2.3 Certificado e perfil do iPhone
1. Codemagic › Team settings › **Code signing identities › iOS certificates**
   › **Generate certificate** › tipo **Apple Distribution**, usando a chave
   `asc-amigoocultoja`. Guarde a senha que ele mostra.
2. developer.apple.com › **Profiles › +** › **App Store Connect** › App ID
   `br.com.amigoocultoja.app` › o certificado que acabou de nascer › nome
   `Amigo Oculto Ja App Store` › Generate.
3. Codemagic › **iOS provisioning profiles** › **Fetch profiles** › escolha
   esse perfil.

O App ID já tem Sign In with Apple e Associated Domains (criados em
12/10/2026). Se um dia mudar uma capability, gere o perfil de novo e busque
outra vez: o build usa a cópia guardada no Codemagic, e o passo de
conferência falha cedo se ela estiver velha.

### 2.4 Chave do Android: `amigoocultoja-upload`
Codemagic › **Code signing identities › Android keystores** › upload do
`amigoocultoja-upload.jks` criado no Android Studio, com a senha do
keystore, o alias `upload` e a senha da chave. Nome de referência:
`amigoocultoja-upload`. É a mesma chave do primeiro envio: outra chave e a
Play recusa.

### 2.5 Grupo de variáveis `google_play`
Uma conta de serviço do Google com acesso à Play (o mesmo procedimento dos
outros apps). Codemagic › **Environment variables** › grupo `google_play` ›
variável `GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS` com o conteúdo do JSON,
marcada como **Secret**. (O nome antigo `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
ainda funciona nas ferramentas, mas o yaml usa o novo.)

## 3. O primeiro envio

- **Android**: o primeiro .aab sobe **à mão** no Play Console (Teste
  interno), porque a API do Google só aceita envio automático depois disso.
  Foi gerado no Android Studio (seção 3.1). Os seguintes vão pelo
  `android-play` ou pelo `lojas`.
- **iPhone**: o primeiro já pode ir pelo `ios-testflight`. O app existe no
  App Store Connect (Apple ID `6821636982`).

### 3.1 O .aab pelo Android Studio (primeira vez, ou sem o Codemagic)

```powershell
cd C:\Apps\amigoocultoja
git config --global core.longpaths true
git clone https://github.com/rod455/AmigoOcultoJa.git app
cd app
git checkout main
npm ci
npx expo prebuild -p android
```

No PowerShell do Windows, um comando por linha (`&&` não funciona).

1. Android Studio › Open › `C:\Apps\amigoocultoja\app\android`.
2. Build › Generate Signed App Bundle or APK › Android App Bundle.
3. Create new… › `C:\Apps\amigoocultoja\chaves\amigoocultoja-upload.jks`
   (fora da pasta do projeto), alias `upload`, validade 25 anos, país `BR`.
   Guarde o arquivo e as senhas num gerenciador de senhas.
4. Variante **release** › Create. Sai em
   `android/app/release/app-release.aab`.

## 4. O dia a dia

Codemagic › o app › **Start new build** › branch **`main`** › workflow
(toda mudança, do site e dos apps, chega à `main`; é dela que saem os
builds das duas lojas):

| workflow | máquina | gera | publica em |
|---|---|---|---|
| `lojas` | Mac mini M2 | .aab e .ipa | Play (interna) e TestFlight |
| `ios-testflight` | Mac mini M2 | .ipa | TestFlight |
| `android-play` | Mac mini M2 (o plano gratuito não libera Linux) | .aab | Play (interna) |

Cada um roda, na ordem: `npm ci`, typecheck, testes e
`scripts/conferir-app.mjs`; pergunta à loja o último número de build;
`expo prebuild`; assina; compila; publica. **`xcode: latest`** por enquanto:
no primeiro build verde, o log imprime `xcodebuild -version`; fixe essa versão
no yaml (lição 8 do guia: "não mexi em nada" não significa "nada mudou").

## 5. O que o app tem de diferente do site (e por quê)

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
  pela sessão e segue para onde a pessoa estava.
- **Criptografia**: `usesNonExemptEncryption: false` no `app.json` (só HTTPS).
- **Idioma**: o app declara português do Brasil, então as janelas do sistema
  aparecem em português.
- **Permissões**: o Android bloqueia armazenamento externo e "sobrepor a
  outros apps", que o app não usa (`blockedPermissions` no `app.json`).

## 6. Links universais (`/g/...` abrindo o app)

- **iPhone**: `public/.well-known/apple-app-site-association`, publicado em
  12/10/2026 com o Team ID `GGM89XNN4S` (conta individual: o vendedor na App
  Store aparece como Rodrigo Moraes da Silva). Também liga o preenchimento
  automático de senha do iPhone para o site (`webcredentials`).
- **Android**: `public/.well-known/assetlinks.json`, publicado em 12/10/2026
  com o SHA-256 da **chave de assinatura do app** (a que fica com o Google:
  Play Console › Proteção da Google Play Store › Assinatura de apps). Builds
  instalados fora da Play (assinados só com a chave de upload) não abrem o
  link direto; os da loja abrem.

## 7. O que precisa de build e o que não

| onde mora a mudança | precisa de build? |
|---|---|
| landing, páginas legais, `llms.txt` (site) | não, vai no push |
| banco, RPCs, edge functions, catálogo de presentes | não |
| textos e telas em `src/` | **sim** (sem atualização pela rede, cada mudança passa pela loja) |
| `app.json`, biblioteca nativa nova, ícone, splash | sim |

Por isso, o que puder morar no servidor (catálogo, textos de e-mail, regras do
sorteio) mora no servidor.

## 8. O ritual de uma versão

1. Abrir `docs/lojas/novidades-<versão>.md` com o que entra (cada item com
   commit), a nota das lojas e o **roteiro de aparelho escrito antes do build**.
2. No momento do botão, escrever na ficha o commit de onde o build saiu
   (`**Árvore do build:** <sha>`). O que entrar depois é da próxima versão.
3. Rodar o workflow; rodar o roteiro no TestFlight e na faixa interna.
4. Promover nas lojas. Só então: acrescentar a versão em
   `docs/lojas/publicadas.json` e subir a versão no `app.json` para a
   próxima (`expo.version`, ou `expo.android.version` / `expo.ios.version`
   se só uma loja andar). A conferência recusa build de produção com versão
   já enviada para aquela loja.
5. Sobre um build que nenhum aparelho abriu, a resposta é "sem sinal ainda".
   O segundo sinal é a medição:
   `select app_version, build, platform, count(*) from events where name = 'session_started' group by 1, 2, 3`.
