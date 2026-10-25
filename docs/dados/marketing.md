# Medição de campanha e anúncios (temporada 2026)

O código está pronto e **desligado**. Cada parte liga sozinha quando recebe o
seu ID ou arquivo. Nenhum desses IDs é segredo, mas nenhum vai no chat:
cada um vai direto no painel indicado.

Os eventos continuam sendo gravados no nosso banco (`events`, ver
`como-medimos.md`). Os de campanha também vão para o Google:

| Nosso evento | No Google (GA4 / Firebase) | Observação |
|---|---|---|
| `auth_completed` | `sign_up` (`method`) | No site, também é a **conversão do Google Ads**, com Enhanced Conversions (e-mail com hash pelo gtag). |
| `draw_completed_client` | `draw_completed` (`participantes`) | |
| `participant_claimed` | `participant_claimed` | |
| `outbound_click` | `outbound_click` (`origem`) | |
| `create_started` | `create_started` (`origem`) | |
| `share_whatsapp_clicked`, `link_copied` | `share` (`method`) | |
| `wish_list_saved` | `wish_list_saved` | |
| `batch_imported` | `batch_imported` (`grupos`, `pessoas`) | |

O mapa está em `src/lib/marketing-events.ts` (testes em `tests/marketing.test.ts`).
Nenhum parâmetro leva nome, e-mail ou código de grupo.

## Site: GA4 e Google Ads

**Onde configurar:** Vercel › projeto `amigoocultoja` › Settings › Environment
Variables (Production e Preview). Depois, publique de novo (Redeploy).

| Variável | Exemplo | De onde vem |
|---|---|---|
| `EXPO_PUBLIC_GA4_ID` | `G-ABC123XYZ` | GA4 › Administrador › Fluxos de dados › Web |
| `EXPO_PUBLIC_GOOGLE_ADS_ID` | `AW-123456789` | Google Ads › Metas › Conversões (o Paulo envia) |
| `EXPO_PUBLIC_GOOGLE_ADS_CADASTRO` | `AW-123456789/AbCdEfGh` | A ação de conversão "Cadastro" (ID/rótulo) |

**Como funciona:**
- A tag (`src/app/+html.tsx`) começa com o **Consent Mode v2** negado.
- O aviso de cookies (`src/features/consent/ConsentBanner.tsx`) só aparece com a tag ligada. "Aceitar" libera os cookies e o e-mail das Enhanced Conversions; "Recusar" mantém tudo negado.
- A escolha fica no navegador (`aoj.consent`).
- O GA4 conta as páginas sozinho.
- Os eventos saem de `track()` (`src/lib/marketing.web.ts`).
- No Google Ads, ligue **Enhanced Conversions** na ação "Cadastro" (método: tag do Google).

## Páginas de conteúdo

Ver `src/content/paginas/README.md`.

O autor (Paulo Silva) está em `src/content/autores.json`:
- foto: coloque em `public/autores/paulo-silva.jpg`, quadrada, e preencha `foto`;
- bio: uma ou duas frases.

Sem foto, aparecem as iniciais.

O botão "Criar sorteio" leva a `/criar/nome`, o primeiro passo de criar um grupo.

## App: Firebase Analytics

**O que fazer:**
1. No console do Firebase, crie o projeto e ligue ao GA4.
2. Adicione o app do iPhone (`br.com.amigoocultoja.app`) e baixe o `GoogleService-Info.plist`.
3. Adicione o app do Android (`br.com.amigoocultoja.app`) e baixe o `google-services.json`.
4. Coloque os dois arquivos em `firebase/` no repositório. O Firebase diz que eles podem ser versionados.
5. Rode uma build nova no Codemagic. **Antes de mandar para a loja, teste no TestFlight e na faixa interna.**

**O que liga com os dois arquivos** (`native-services.js` → `app.config.js` e `react-native.config.js`):
- o módulo nativo entra na build;
- `FirebaseApp.configure()`;
- **frameworks dinâmicos no iPhone**, exigidos pelo Firebase 13+;
- sem o identificador de publicidade (`firebase.json` e `withoutAdIdSupport`), então o iPhone não mostra o aviso de rastreamento.

**No app:**
- os eventos saem de `track()` e as telas de `screenView()` (`src/lib/marketing.ts`);
- códigos de grupo viram `[codigo]`.

**Nas lojas, depois da versão com Firebase:**
- App Store Connect › Privacidade do app: "Dados de uso" e "Identificadores › ID do dispositivo", para Análise, não vinculados à pessoa, sem rastreamento.
- Play › Segurança dos dados: "Atividade no app" e "IDs do dispositivo", para Análise.

## App: AdMob

**Onde configurar:** Codemagic › variáveis do app (grupo do workflow).

| Variável | Para quê |
|---|---|
| `ADMOB_APP_ID_IOS`, `ADMOB_APP_ID_ANDROID` | ID de cada app no AdMob (`ca-app-pub-…~…`). Com os dois, o AdMob entra na build. |
| `EXPO_PUBLIC_ADMOB_BANNER_IOS`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | Bloco de anúncio de banner (`ca-app-pub-…/…`). |

O componente é `src/features/ads/AdBanner.tsx` (`<AdBanner placement="..." />`). Os anúncios são sempre não personalizados: sem aviso de rastreamento no iPhone e sem consentimento extra.

**Ainda não está em nenhuma tela.** Onde mostrar é uma decisão de produto: tela do participante, painel ou início. Antes de ligar:
1. Escolher a tela e colocar o `<AdBanner>`.
2. Atualizar a Política de Privacidade (AdMob, anúncios não personalizados).
3. Na App Store, marcar "o app contém anúncios"; na Play, "Contém anúncios".
4. Publicar o `app-ads.txt` que o AdMob fornecer em `public/app-ads.txt`.

## AdSense (site)

Quando o AdSense aprovar, publique o `ads.txt` que ele fornecer em `public/ads.txt`.
