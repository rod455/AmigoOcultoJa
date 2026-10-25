import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { type ErrorBoundaryProps, router, Stack, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NoIndex } from '@/components/NoIndex';
import { Button, Sub, Title } from '@/components/ui';
import { AuthUrlHandler } from '@/features/auth/AuthUrlHandler';
import { ConsentBanner } from '@/features/consent/ConsentBanner';
import { CONTENT_PATHS } from '@/features/conteudo/ContentPage';
import { getAttribution } from '@/lib/attribution';
import { installErrorHandlers, reportError, setCurrentScreen } from '@/lib/errors';
import { screenView } from '@/lib/marketing';
import { startSession } from '@/lib/session';
import { colors } from '@/theme/tokens';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  installErrorHandlers();
  // lê a campanha da URL antes que qualquer tela a limpe
  void getAttribution();
}

/** Únicas páginas que os buscadores podem indexar (ver public/sitemap.xml). */
const PUBLIC_PATHS = new Set(['/', '/empresas', '/privacidade', '/termos', '/suporte', ...CONTENT_PATHS]);

export default function RootLayout() {
  const pathname = usePathname();
  const [loaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  useEffect(() => {
    if (loaded && Platform.OS !== 'web') void SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    setCurrentScreen(pathname);
    startSession(pathname);
    screenView(pathname);
  }, [pathname]);

  // No web, renderiza mesmo antes da fonte (fallback system-ui) para o export estático.
  if (!loaded && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* padrões de cada página; a landing, as legais e o convite substituem */}
      <Head>
        <title>Amigo Oculto Já!</title>
        <meta name="description" content="Sorteio de amigo oculto (amigo secreto) online e grátis. Cada um descobre quem tirou por um link no WhatsApp e já escolhe o presente." />
        <meta property="og:title" content="Amigo Oculto Já! · A surpresa fica. A complicação sai." />
        <meta property="og:description" content="Seu amigo oculto começa aqui. Cada um descobre quem tirou por um link no WhatsApp e já escolhe o presente." />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <AuthUrlHandler />
      {Platform.OS === 'web' && !PUBLIC_PATHS.has(pathname) ? <NoIndex /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.surfaceAlt : colors.surface },
          animation: 'slide_from_right',
        }}
      />
      {Platform.OS === 'web' ? <ConsentBanner /> : null}
    </SafeAreaProvider>
  );
}

/**
 * Erro ao desenhar uma tela: em vez de fechar o app (ou deixar a página em
 * branco), registra em app_errors e oferece tentar de novo.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError('render', error);
  }, [error]);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 24, justifyContent: 'center', gap: 16 }}>
        <Title size={28}>Ops, algo deu errado aqui</Title>
        <Sub>Já recebemos o aviso do problema. Tente de novo; se continuar, volte para o início.</Sub>
        <Button label="Tentar de novo" onPress={() => void retry()} />
        <Button label="Ir para o início" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaProvider>
  );
}
