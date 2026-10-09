import { ScrollViewStyleReset } from 'expo-router/html';
import React, { type PropsWithChildren } from 'react';

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
        <meta name="description" content="Amigo Oculto Já!: a surpresa fica, a complicação sai. Monte o grupo, sorteie e mande um link no WhatsApp. Cada um descobre quem tirou e já escolhe o presente." />
        <meta property="og:title" content="Amigo Oculto Já! · A surpresa fica. A complicação sai." />
        <meta property="og:site_name" content="Amigo Oculto Já!" />
        <meta property="og:image" content="https://amigoocultoja.com.br/brand/og.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:description" content="Seu amigo oculto começa aqui. Cada um descobre quem tirou por um link no WhatsApp e já escolhe o presente." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const css = `
html, body { background: #F4F5F6; }
body { font-family: Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
#root { min-height: 100vh; }
input, textarea, button { font-family: inherit; }
::selection { background: #111418; color: #fff; }
*:focus-visible { outline: 2px solid #111418; outline-offset: 2px; border-radius: 4px; }
/* Figtree carregada via Google Fonts: mapeia os nomes do expo-font para a família local */
@font-face { font-family: 'Figtree_400Regular'; src: local('Figtree'), local('Figtree Regular'); font-weight: 400; }
@font-face { font-family: 'Figtree_500Medium'; src: local('Figtree Medium'), local('Figtree'); font-weight: 500; }
@font-face { font-family: 'Figtree_600SemiBold'; src: local('Figtree SemiBold'), local('Figtree'); font-weight: 600; }
@font-face { font-family: 'Figtree_700Bold'; src: local('Figtree Bold'), local('Figtree'); font-weight: 700; }
@font-face { font-family: 'Figtree_800ExtraBold'; src: local('Figtree ExtraBold'), local('Figtree'); font-weight: 800; }
`;
