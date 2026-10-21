import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Screen, Sub, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { exchangeCode, isOAuthInFlight, takePendingNext } from '@/lib/auth';
import { colors } from '@/theme/tokens';

/**
 * "amigoocultoja://auth?code=..." — volta dos links de e-mail no app
 * (confirmar conta, nova senha). No web esses links voltam para a própria
 * página e quem trata é o AuthUrlHandler; aqui só sobra mandar para o início.
 */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    // Login com Google pelo navegador: quem troca o código é a tela de conta.
    // No Android a volta também abre esta rota por cima; quando o login
    // termina, ela sai da frente.
    if (isOAuthInFlight()) {
      const timer = setInterval(() => {
        if (!alive || isOAuthInFlight()) return;
        clearInterval(timer);
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }, 300);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }
    (async () => {
      const ok = typeof code === 'string' && code ? await exchangeCode(code) : false;
      if (!alive) return;
      if (!ok) {
        setFailed(true);
        return;
      }
      track('auth_completed', { metodo: 'email_link' });
      const next = await takePendingNext();
      router.replace((next ?? '/') as never);
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  if (failed) {
    return (
      <Screen padTop={48} footer={<Button label="Ir para o início" onPress={() => router.replace('/')} />}>
        <View style={{ gap: 12 }}>
          <Title size={28}>Esse link não vale mais</Title>
          <Sub>Ele já foi usado ou expirou. Entre com seu e-mail e senha, ou peça um link novo.</Sub>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
