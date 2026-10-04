import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from '@/components/icons';
import { Button, Logo, Mark, Row, Screen, Sub, T, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { myGroups, type MyGroup } from '@/lib/api';
import { isConfigured } from '@/lib/supabase';
import { groupMeta } from '@/lib/format';
import { colors } from '@/theme/tokens';

/** Tela 1 — Início (SInicio) */
export function StartScreen() {
  const [groups, setGroups] = useState<MyGroup[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (isConfigured) {
        myGroups()
          .then((g) => alive && setGroups(g))
          .catch(() => undefined);
      }
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <Screen
      padTop={28}
      footer={
        <View style={{ gap: 6 }}>
          <Link href="/criar/nome" asChild>
            <Button label="Criar amigo oculto" onPress={() => track('create_started', { origem: 'home' })} />
          </Link>
          <Link href="/entrar" asChild>
            <Button label="Tenho um convite" variant="ghost" />
          </Link>
        </View>
      }
    >
      <Logo />
      <View style={{ flexGrow: 1, justifyContent: 'center', gap: 20, paddingVertical: 32 }}>
        <Mark />
        <Title size={38}>Amigo oculto sem papelzinho.</Title>
        <Sub>Monte em 1 minuto. Cada um descobre quem tirou por um link no WhatsApp.</Sub>
      </View>
      {groups.length > 0 ? (
        <View style={{ paddingBottom: 8 }}>
          <T size={14} weight="bold" color={colors.textSecondary} style={{ paddingBottom: 4 }}>
            SEUS GRUPOS
          </T>
          {groups.map((g) => (
            <Link key={g.code} href={{ pathname: '/painel/[codigo]', params: { codigo: g.code } }} asChild>
              <Pressable accessibilityRole="link">
                <Row>
                  <View style={{ flexGrow: 1 }}>
                    <T size={17} weight="semibold">
                      {g.name}
                    </T>
                    <T size={13} color={colors.textSecondary}>
                      {groupMeta(g.budget_cents, g.exchange_at)} · {g.viewed} de {g.total} viram
                    </T>
                  </View>
                  <ChevronRight />
                </Row>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
