import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { EnterScreen } from './EnterScreen';
import { RevealScreen } from './RevealScreen';
import { Button, Loading, Screen, Sub, Title, TopBar } from '@/components/ui';
import { track } from '@/lib/analytics';
import { friendlyError, getGroup, type InvitePerson, invitePerson, type PublicGroup } from '@/lib/api';
import { GroupBrandProvider } from '@/features/brand/GroupBrand';
import { getClaim, setClaim } from '@/lib/device';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'enter'; group: PublicGroup; invite?: InvitePerson }
  /** convite individual ligado e a pessoa abriu o link geral: precisa do link pessoal */
  | { kind: 'need_invite'; group: PublicGroup }
  | { kind: 'reveal'; group: PublicGroup; participantId: string };

/**
 * Decide entre "Quem é você?" (tela 7) e "Você tirou" (telas 8/9) conforme
 * este aparelho já tenha assumido um nome neste grupo.
 */
export function ParticipantFlow({ code, token }: { code: string; token?: string | null }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    try {
      const [group, claimed] = await Promise.all([getGroup(code), getClaim(code)]);
      if (claimed && group.participants.some((p) => p.id === claimed)) {
        setState({ kind: 'reveal', group, participantId: claimed });
      } else {
        if (claimed) await setClaim(code, null);
        if (group.personal_invites) {
          // grupo com convite individual: só o link pessoal deixa escolher o nome
          const invite = token ? await invitePerson(code, token).catch(() => null) : null;
          setState(invite ? { kind: 'enter', group, invite } : { kind: 'need_invite', group });
        } else {
          setState({ kind: 'enter', group });
        }
      }
    } catch (e) {
      setState({ kind: 'error', message: friendlyError(e) });
    }
  }, [code, token]);

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

  if (state.kind === 'need_invite') {
    return (
      <GroupBrandProvider brand={state.group.brand}>
        <Screen top={<TopBar backTo="/" />}>
          <View style={{ paddingTop: 40, gap: 12 }}>
            <Title>Este convite é individual.</Title>
            <Sub>
              No {state.group.name}, cada pessoa recebe um link só dela, para ninguém escolher o nome de outra. Abra o link que chegou para você. Não achou? Peça a quem organizou.
            </Sub>
          </View>
        </Screen>
      </GroupBrandProvider>
    );
  }

  if (state.kind === 'enter') {
    return (
      <GroupBrandProvider brand={state.group.brand}>
        <EnterScreen
          group={state.group}
          invite={state.invite}
          token={token}
          onClaimed={async (participantId) => {
            await setClaim(code, participantId);
            setState({ kind: 'reveal', group: state.group, participantId });
          }}
        />
      </GroupBrandProvider>
    );
  }

  return (
    <GroupBrandProvider brand={state.group.brand}>
      <RevealScreen
        code={code}
        participantId={state.participantId}
        onSwitch={async () => {
          await setClaim(code, null);
          void load();
        }}
      />
    </GroupBrandProvider>
  );
}
