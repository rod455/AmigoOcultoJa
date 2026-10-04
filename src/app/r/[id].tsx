import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Loading, Screen, Sub, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { friendlyError, resolveLink } from '@/lib/api';
import { openExternal } from '@/lib/open';

/**
 * Redirecionador de afiliados: /r/{id}?c={codigo}&p={participante}&o={origem}
 * `id` é um wish_item. Registra o clique em outbound_clicks e redireciona.
 * Permite trocar de loja sem atualizar o app (spec §11).
 */
export default function Redirect() {
  const params = useLocalSearchParams<{ id: string; c?: string; p?: string; o?: string }>();
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    const id = String(params.id ?? '');
    if (!id) {
      setError('Link inválido.');
      return;
    }
    track('outbound_click', { origem: params.o ?? 'link' }, { code: params.c, participantId: params.p });
    resolveLink({ wishItemId: id, code: params.c, participantId: params.p, origin: params.o ?? 'link' })
      .then((r) => {
        setUrl(r.url);
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.replace(r.url);
        else void openExternal(r.url).then(() => router.back());
      })
      .catch((e) => setError(friendlyError(e)));
  }, [params.id, params.c, params.p, params.o]);

  return (
    <Screen footer={error ? <Button label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : undefined}>
      {error ? (
        <View style={{ paddingTop: 40, gap: 12 }}>
          <Title>Esse link não abriu.</Title>
          <Sub>{error}</Sub>
        </View>
      ) : (
        <View style={{ paddingTop: 40, gap: 12 }}>
          <Sub>Abrindo a loja…</Sub>
          {url ? <Button label="Continuar para a loja" variant="accent" onPress={() => openExternal(url)} /> : <Loading />}
        </View>
      )}
    </Screen>
  );
}
