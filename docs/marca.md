# Marca: Amigo Oculto Já!

A identidade oficial é a direção **Segredo simpático** (v1.0, 9/10/2026). O guia completo e os arquivos originais estão em `docs/marca/`:

| Arquivo | Conteúdo |
|---|---|
| `docs/marca/amigo-oculto-ja-marca.md` | Guia de marca aprovado (nome, voz, símbolo, cores, tipografia, campanha) |
| `docs/marca/referencia/prancha-aprovada.png` | Prancha visual aprovada. Anexe sempre ao pedir uma peça nova |
| `docs/marca/logos/` | Logo principal e monocromático (transparentes) e versão pronta sobre carvão |
| `docs/marca/simbolos/` | Símbolo isolado |
| `docs/marca/campanhas/` | Arte vertical "Quem será?" |
| `docs/marca/implementacao/` | Cores em CSS e JSON |

Este arquivo substitui o guia anterior (v1.1), que usava o nome "Tirei!". Esse nome não deve aparecer em materiais novos.

## Onde a marca está aplicada no código

| Peça | Arquivo | Origem no kit |
|---|---|---|
| Cores (inclui pêssego `#F6E3DC`) | `src/theme/tokens.ts` | `implementacao/tokens.css` |
| Logo e símbolo nas telas | `src/components/ui.tsx` (`Logo`, `BrandSymbol`) usando `assets/brand/` | `logos/`, `simbolos/` recortados e otimizados |
| Botão principal vermelho, secundário carvão | `src/components/ui.tsx` (`Button`) | Guia §8 |
| Landing page com a faixa "Quem será?" | `src/features/landing/LandingPage.tsx` | Guia §9 |
| Ícone do app, Android adaptativo, splash | `assets/icon.png`, `assets/android-icon-*.png`, `assets/splash-icon.png`, `app.json` | `icones/icone-app-1024.png`, símbolo sobre pêssego |
| Favicon, ícone do iPhone, manifesto web | `assets/favicon.png`, `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/icon-*.png`, `public/manifest.json` | `icones/` |
| Imagem de compartilhamento (1200 × 630) | `public/brand/og.jpg` | Logo principal sobre pêssego |
| Arte "Quem será?" para redes | `public/brand/campanha-quem-sera.jpg` | `campanhas/campanha-quem-sera-story.png` |
| E-mails de login | `scripts/email-templates.mjs`, `public/email/logo-dark.png` | `logos/logo-fundo-escuro.png` |

Os arquivos em `assets/` e `public/` são derivados dos PNGs do kit, só recortados, reduzidos e com a paleta compactada. Nenhum foi redesenhado. Para gerar de novo, use os originais em `docs/marca/`.

## Regras rápidas para quem mexe no produto

- **Nome:** sempre "Amigo Oculto Já!", com acento e exclamação. Nunca "AOJ", "AO Já" ou "Tirei!".
- **Assinatura:** "A surpresa fica. A complicação sai.", com essa pontuação.
- **Logo:** use a imagem. Não redigite o nome em Figtree para imitar o logotipo.
- **Vocabulário:** grupo, lista de presentes, quem você tirou, quem organiza, enviar convite. Evite wishlist, match, admin, host.
- **Promessas:** só divulgue o que o código faz. Quem organiza cria conta na hora de sortear, então "sem cadastro" vale apenas para quem participa.
