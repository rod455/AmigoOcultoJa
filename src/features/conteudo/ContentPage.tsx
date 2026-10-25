import { Link } from 'expo-router';
import Head from 'expo-router/head';
import React from 'react';
import { Image, View } from 'react-native';
import { T } from '@/components/ui';
import autores from '@/content/autores.json';
import pagesJson from '@/content/paginas.gen.json';
import site from '@/content/site.json';
import { colors } from '@/theme/tokens';

/** Uma página gerada por scripts/paginas.mjs (src/content/paginas.gen.json). */
export type ContentPageData = {
  kind: 'raiz' | 'presentes';
  slug: string;
  path: string;
  title: string;
  description: string;
  updated: string;
  author: string;
  faq: Array<[string, string]>;
  html: string;
  words: number;
};
const pages = pagesJson as unknown as ContentPageData[];
type Author = { nome: string; foto: string; bio: string };

/** Páginas de um tipo, para o generateStaticParams das rotas. */
export function pagesOf(kind: 'raiz' | 'presentes'): ContentPageData[] {
  return pages.filter((p) => p.kind === kind);
}

export function findPage(kind: 'raiz' | 'presentes', slug: string): ContentPageData | undefined {
  return pages.find((p) => p.kind === kind && p.slug === slug);
}

/** Endereços das páginas de conteúdo (indexáveis, ver NoIndex no _layout). */
export const CONTENT_PATHS = pages.map((p) => p.path);

const CREATE = '/criar/nome';
const W = 720;

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function CreateButton() {
  return (
    <Link
      href={CREATE}
      style={{ alignSelf: 'flex-start', backgroundColor: colors.accent, color: '#FFFFFF', fontFamily: 'Figtree_700Bold', fontSize: 17, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 30, textDecorationLine: 'none' }}
    >
      Criar sorteio
    </Link>
  );
}

function Avatar({ author, size }: { author: Author; size: number }) {
  if (author.foto) return <Image source={{ uri: author.foto }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel={author.nome} />;
  const initials = author.nome
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }}>
      <T size={size * 0.38} weight="extrabold" color={colors.accentDark}>
        {initials}
      </T>
    </View>
  );
}

/**
 * Página de conteúdo (src/content/paginas/*.md): só texto e o botão "Criar
 * sorteio". O HTML sai pronto do export e scripts/postexport.mjs tira o
 * JavaScript do app dessas páginas, para abrirem rápido.
 */
export function ContentPage({ page }: { page: ContentPageData }) {
  const url = `${site.url}${page.path}`;
  const author = (autores as unknown as Record<string, Author>)[page.author] ?? { nome: page.author, foto: '', bio: '' };
  const authorJson = {
    '@type': 'Person',
    name: author.nome,
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.foto ? { image: `${site.url}${author.foto}` } : {}),
  };
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#artigo`,
        headline: page.title,
        description: page.description,
        inLanguage: 'pt-BR',
        datePublished: page.updated,
        dateModified: page.updated,
        author: authorJson,
        publisher: { '@type': 'Organization', '@id': `${site.url}/#org`, name: site.name, logo: `${site.url}/icon-512.png` },
        mainEntityOfPage: url,
        image: `${site.url}/brand/og.jpg`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${site.url}/` },
          { '@type': 'ListItem', position: 2, name: page.title, item: url },
        ],
      },
      ...(page.faq.length
        ? [
            {
              '@type': 'FAQPage',
              inLanguage: 'pt-BR',
              mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
            },
          ]
        : []),
    ],
  });

  return (
    <View style={{ flex: 1, minHeight: '100vh' as unknown as number, backgroundColor: colors.surface, alignItems: 'center' }}>
      <Head>
        <title>{`${page.title} | ${site.name}`}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={url} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={`${site.url}/brand/og.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="article:modified_time" content={page.updated} />
        <script type="application/ld+json">{jsonLd}</script>
      </Head>
      <View style={{ width: '100%', maxWidth: W, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 }}>
          {/* <img> simples: o Image do app só aparece depois do JavaScript, que esta página não carrega */}
          <Link href="/" accessibilityLabel={`${site.name}: início`}>
            {React.createElement('img', { src: '/brand/logo-360.webp', alt: site.name, width: 128, height: 40, style: { display: 'block' } })}
          </Link>
          <Link href={CREATE} style={{ fontFamily: 'Figtree_700Bold', fontSize: 15, color: colors.accentDark }}>
            Criar sorteio
          </Link>
        </View>

        <View style={{ gap: 14, paddingTop: 12, paddingBottom: 8 }}>
          <T size={34} weight="extrabold" lineHeight={40} style={{ letterSpacing: -0.8 }} accessibilityRole="header" aria-level={1}>
            {page.title}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar author={author} size={36} />
            <T size={14} color={colors.textSecondary}>
              Por <T size={14} weight="semibold" color={colors.text}>{author.nome}</T> · Atualizado em {formatDate(page.updated)}
            </T>
          </View>
          <View style={{ paddingTop: 6 }}>
            <CreateButton />
          </View>
        </View>

        {React.createElement('div', { className: 'conteudo', dangerouslySetInnerHTML: { __html: page.html } })}

        {page.faq.length ? (
          <View style={{ gap: 14, paddingTop: 24 }}>
            <T size={24} weight="extrabold" accessibilityRole="header" aria-level={2}>
              Perguntas frequentes
            </T>
            {page.faq.map(([q, a]) => (
              <View key={q} style={{ gap: 4 }}>
                <T size={17} weight="bold" accessibilityRole="header" aria-level={3}>
                  {q}
                </T>
                <T size={16} color={colors.textSecondary} lineHeight={25}>
                  {a}
                </T>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 14, marginTop: 32, padding: 22, borderRadius: 20, backgroundColor: colors.peach }}>
          <T size={22} weight="extrabold">
            Bora sortear?
          </T>
          <T size={16} color={colors.textSecondary} lineHeight={24}>
            Grátis. Cada pessoa descobre quem tirou pelo link e já escolhe o presente.
          </T>
          <CreateButton />
        </View>

        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingTop: 28 }}>
          <Avatar author={author} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <T size={16} weight="bold">
              {author.nome}
            </T>
            {author.bio ? (
              <T size={14} color={colors.textSecondary} lineHeight={20}>
                {author.bio}
              </T>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 10, paddingTop: 36, paddingBottom: 40, marginTop: 28, borderTopWidth: 1, borderTopColor: colors.line }}>
          <T size={14} weight="semibold" color={colors.textSecondary}>
            {site.name} · A surpresa fica. A complicação sai.
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {[
              ['/', 'Início'],
              ['/empresas', 'Para empresas'],
              ['/privacidade', 'Privacidade'],
              ['/termos', 'Termos de Uso'],
              ['/suporte', 'Ajuda'],
            ].map(([href, label]) => (
              <Link key={href} href={href as '/'} style={{ fontFamily: 'Figtree_600SemiBold', fontSize: 13, color: colors.textSecondary }}>
                {label}
              </Link>
            ))}
          </View>
          <T size={12} color={colors.textSecondary} lineHeight={18}>
            As lojas pagam comissão ao {site.name} pelos links de presente. O preço para você é o mesmo. Como Associado da Amazon, recebemos por compras qualificadas.
          </T>
        </View>
      </View>
    </View>
  );
}
