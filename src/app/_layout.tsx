import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Stack, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NoIndex } from '@/components/NoIndex';
import { AuthUrlHandler } from '@/features/auth/AuthUrlHandler';
import { colors } from '@/theme/tokens';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}

/** Únicas páginas que os buscadores podem indexar (ver public/sitemap.xml). */
const PUBLIC_PATHS = new Set(['/', '/privacidade', '/termos']);

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
    </SafeAreaProvider>
  );
}
