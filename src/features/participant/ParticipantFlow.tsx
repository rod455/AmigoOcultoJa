import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { EnterScreen } from './EnterScreen';
import { RevealScreen } from './RevealScreen';
import { Button, Loading, Screen, Sub, Title, TopBar } from '@/components/ui';
import { track } from '@/lib/analytics';
import { friendlyError, getGroup, type PublicGroup } from '@/lib/api';
import { getClaim, setClaim } from '@/lib/device';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'enter'; group: PublicGroup }
  | { kind: 'reveal'; group: PublicGroup; participantId: string };

/**
 * Decide entre "Quem é você?" (tela 7) e "Você tirou" (telas 8/9) conforme
 * este aparelho já tenha assumido um nome neste grupo.
 */
export function ParticipantFlow({ code }: { code: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    try {
      const [group, claimed] = await Promise.all([getGroup(code), getClaim(code)]);
      if (claimed && group.participants.some((p) => p.id === claimed)) {
        setState({ kind: 'reveal', group, participantId: claimed });
      } else {
        if (claimed) await setClaim(code, null);
        setState({ kind: 'enter', group });
      }
    } catch (e) {
      setState({ kind: 'error', message: friendlyError(e) });
    }
  }, [code]);

  useEffect(() => {
    track('invite_opened', { plataforma: Platform.OS, app_instalado: Platform.OS !== 'web' }, { code });
    void load();
  }, [load, code]);

  if (state.kind === 'loading') {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (state.kind === 'error') {
    return (
      <Screen top={<TopBar backTo="/" />} footer={<Button label="Ir para o início" onPress={() => router.replace('/')} />}>
        <View style={{ paddingTop: 40, gap: 12 }}>
          <Title>Ops.</Title>
          <Sub>{state.message}</Sub>
        </View>
      </Screen>
    );
  }

  if (state.kind === 'enter') {
    return (
      <EnterScreen
        group={state.group}
        onClaimed={async (participantId) => {
          await setClaim(code, participantId);
          setState({ kind: 'reveal', group: state.group, participantId });
        }}
      />
    );
  }

  return (
    <RevealScreen
      code={code}
      participantId={state.participantId}
      onSwitch={async () => {
        await setClaim(code, null);
        void load();
      }}
    />
  );
}
