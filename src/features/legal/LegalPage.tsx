import { Link } from 'expo-router';
import Head from 'expo-router/head';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Logo, T } from '@/components/ui';
import { useViewportWidth } from '@/lib/useViewportWidth';
import { colors } from '@/theme/tokens';

/** Bloco de texto: parágrafo simples ou lista de itens com destaque opcional no começo. */
export type LegalBlock = string | { list: Array<string | [string, string]> };

export type LegalSection = { title: string; body: LegalBlock[] };

export const CONTACT_EMAIL = 'amigoocultoja@gmail.com';
export const LEGAL_UPDATED = '10 de outubro de 2026';

/** Página de texto legal (privacidade, termos), com a mesma moldura do site. */
export function LegalPage({
  title,
  metaTitle,
  metaDescription,
  intro,
  sections,
  other,
}: {
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: LegalSection[];
  other: { href: '/privacidade' | '/termos'; label: string };
}) {
  const width = useViewportWidth();
  const pad = width >= 600 ? 32 : 20;
  const wide = width >= 860;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
      </Head>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 760, paddingHorizontal: pad, paddingBottom: 64 }}>
          <View style={{ height: wide ? 100 : 76, justifyContent: 'center' }}>
            <Link href="/" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Amigo Oculto Já!, início" style={{ alignSelf: 'flex-start' }}>
                <Logo height={wide ? 56 : 44} />
              </Pressable>
            </Link>
          </View>

          <View style={{ gap: 12, paddingTop: wide ? 24 : 8, paddingBottom: 12 }}>
            <T size={wide ? 44 : 32} weight="extrabold" lineHeight={wide ? 48 : 36} style={{ letterSpacing: -1 }} accessibilityRole="header">
              {title}
            </T>
            <T size={14} color={colors.textSecondary}>
              Última atualização: {LEGAL_UPDATED}
            </T>
            <T size={17} color={colors.textSecondary} lineHeight={26} style={{ paddingTop: 8 }}>
              {intro}
            </T>
          </View>

          {sections.map((s, i) => (
            <View key={s.title} style={{ gap: 12, paddingVertical: 24, borderTopWidth: 1, borderTopColor: colors.line, marginTop: i === 0 ? 16 : 0 }}>
              <T size={wide ? 24 : 21} weight="extrabold" lineHeight={wide ? 30 : 27} style={{ letterSpacing: -0.3 }} accessibilityRole="header">
                {`${i + 1}. ${s.title}`}
              </T>
              {s.body.map((b, j) =>
                typeof b === 'string' ? (
                  <T key={j} size={16} color={colors.text} lineHeight={25}>
                    {b}
                  </T>
                ) : (
                  <View key={j} style={{ gap: 10 }}>
                    {b.list.map((item, k) => (
                      <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
                        <T size={16} lineHeight={25} color={colors.accent} weight="bold">
                          •
                        </T>
                        <T size={16} lineHeight={25} style={{ flex: 1 }}>
                          {typeof item === 'string' ? (
                            item
                          ) : (
                            <>
                              <T size={16} lineHeight={25} weight="bold">
                                {item[0]}
                              </T>{' '}
                              {item[1]}
                            </>
                          )}
                        </T>
                      </View>
                    ))}
                  </View>
                ),
              )}
            </View>
          ))}

          <View style={{ gap: 14, paddingTop: 28, borderTopWidth: 1, borderTopColor: colors.line }}>
            <View style={{ padding: 20, borderRadius: 20, backgroundColor: colors.peach, gap: 6 }}>
              <T size={17} weight="bold">
                Dúvidas ou pedidos sobre seus dados
              </T>
              <T size={16} lineHeight={24}>
                Escreva para <T size={16} weight="bold" selectable>{CONTACT_EMAIL}</T>. Respondemos em até 15 dias.
              </T>
            </View>
            <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap', paddingTop: 4 }}>
              <Link href={other.href} asChild>
                <Pressable accessibilityRole="link">
                  <T size={14} weight="semibold" color={colors.textSecondary}>
                    {other.label}
                  </T>
                </Pressable>
              </Link>
              <Link href="/" asChild>
                <Pressable accessibilityRole="link">
                  <T size={14} weight="semibold" color={colors.textSecondary}>
                    Voltar para o início
                  </T>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
