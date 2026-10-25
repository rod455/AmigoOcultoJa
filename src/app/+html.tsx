import { ScrollViewStyleReset } from 'expo-router/html';
import React, { type PropsWithChildren } from 'react';
import { ADS_ID, CONSENT_KEY, GA4_ID } from '@/lib/marketing-config';

/**
 * HTML raiz do export web (static). Roda só em Node durante o export.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#C63D24" />
        <meta name="application-name" content="Amigo Oculto Já!" />
        <meta name="apple-mobile-web-app-title" content="Amigo Oculto Já!" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Resumo para assistentes de IA" />
        <meta property="og:site_name" content="Amigo Oculto Já!" />
        <meta property="og:image" content="https://amigoocultoja.com.br/brand/og.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:type" content="website" />
        {/* ícone do app na aba; o ?v= força o navegador a trocar o ícone antigo guardado em cache */}
        <link rel="icon" href="/favicon.ico?v=2" sizes="48x48" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <link rel="manifest" href="/manifest.json?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {GTAG_ID ? (
          <>
            {/* Google (GA4 + Google Ads) com Consent Mode v2: tudo negado até o "Aceitar" do aviso de cookies */}
            <script dangerouslySetInnerHTML={{ __html: gtagBoot }} />
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`} />
          </>
        ) : null}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const GTAG_ID = GA4_ID || ADS_ID;
const gtagBoot = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
try { var c = localStorage.getItem(${JSON.stringify(CONSENT_KEY)}); if (c === 'granted') gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }); } catch (e) {}
gtag('js', new Date());
${GA4_ID ? `gtag('config', ${JSON.stringify(GA4_ID)});` : ''}
${ADS_ID ? `gtag('config', ${JSON.stringify(ADS_ID)}, { allow_enhanced_conversions: true });` : ''}
`;

const css = `
html, body { background: #F4F5F6; }
body { font-family: Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
#root { min-height: 100vh; }
input, textarea, button { font-family: inherit; }
::selection { background: #111418; color: #fff; }
*:focus-visible { outline: 2px solid #111418; outline-offset: 2px; border-radius: 4px; }
/* texto das páginas de conteúdo (src/content/paginas), que vem do Markdown */
.conteudo { color: #111418; font-size: 17px; line-height: 1.65; padding-top: 12px; }
.conteudo h2 { font-size: 24px; line-height: 1.25; font-weight: 800; margin: 32px 0 10px; letter-spacing: -0.3px; }
.conteudo h3 { font-size: 19px; line-height: 1.3; font-weight: 700; margin: 24px 0 8px; }
.conteudo p, .conteudo ul, .conteudo ol, .conteudo table, .conteudo blockquote { margin: 0 0 16px; }
.conteudo ul, .conteudo ol { padding-left: 22px; }
.conteudo li { margin: 4px 0; }
.conteudo a { color: #A8321C; text-decoration: underline; }
.conteudo strong { font-weight: 700; }
.conteudo img { max-width: 100%; height: auto; border-radius: 12px; }
.conteudo blockquote { border-left: 4px solid #F6E3DC; padding: 4px 0 4px 14px; color: #565C66; }
.conteudo table { border-collapse: collapse; width: 100%; font-size: 15px; display: block; overflow-x: auto; }
.conteudo th, .conteudo td { border: 1px solid #E3E5E8; padding: 8px 10px; text-align: left; }
.conteudo th { background: #F4F5F6; font-weight: 700; }
/* Figtree carregada via Google Fonts: mapeia os nomes do expo-font para a família local */
@font-face { font-family: 'Figtree_400Regular'; src: local('Figtree Regular'), url('/fonts/Figtree_400Regular.ttf') format('truetype'); font-display: swap; }
@font-face { font-family: 'Figtree_500Medium'; src: local('Figtree Medium'), url('/fonts/Figtree_500Medium.ttf') format('truetype'); font-display: swap; }
@font-face { font-family: 'Figtree_600SemiBold'; src: local('Figtree SemiBold'), url('/fonts/Figtree_600SemiBold.ttf') format('truetype'); font-display: swap; }
@font-face { font-family: 'Figtree_700Bold'; src: local('Figtree Bold'), url('/fonts/Figtree_700Bold.ttf') format('truetype'); font-display: swap; }
@font-face { font-family: 'Figtree_800ExtraBold'; src: local('Figtree ExtraBold'), url('/fonts/Figtree_800ExtraBold.ttf') format('truetype'); font-display: swap; }
`;
