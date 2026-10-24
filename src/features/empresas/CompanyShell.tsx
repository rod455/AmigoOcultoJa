import Head from 'expo-router/head';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, T } from '@/components/ui';
import { Footer, MAX_W, Nav } from '@/features/landing/LandingPage';
import { useViewportWidth } from '@/lib/useViewportWidth';
import { biz, colors } from '@/theme/tokens';

/**
 * Moldura das telas da empresa (cadastro e painel). No site: menu e rodapé
 * da página de empresas. No app: voltar no topo, áreas seguras e a tela
 * subindo com o teclado.
 */
export function CompanyShell({
  title,
  backTo = '/',
  navOrigin,
  scrollRef,
  children,
}: {
  title: string;
  backTo?: string;
  navOrigin: string;
  scrollRef?: React.Ref<ScrollView>;
  children: React.ReactNode;
}) {
  const width = useViewportWidth();
  const insets = useSafeAreaInsets();
  const pad = width >= 600 ? 32 : 20;

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <Head>
          <title>{title}</title>
          <meta name="robots" content="noindex" />
        </Head>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
            <Nav empresas cta="Criar um grupo só" ctaOrigin={navOrigin} />
            {children}
          </View>
          <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad, paddingTop: 24 }}>
            <Footer />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <BackButton to={backTo} />
        <T size={13} weight="bold" color={biz.accentDark} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Empresas
        </T>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
