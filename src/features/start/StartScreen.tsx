import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from '@/components/icons';
import { BrandSymbol, Button, Logo, Row, Screen, Sub, T, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { myGroups, type MyGroup } from '@/lib/api';
import { getProfile, type Profile, signOut } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';
import { groupMeta } from '@/lib/format';
import { colors } from '@/theme/tokens';

/** Tela 1 — Início (SInicio) */
export function StartScreen() {
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (isConfigured) {
        myGroups()
          .then((g) => alive && setGroups(g))
          .catch(() => undefined);
        getProfile().then((p) => alive && setProfile(p));
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
            <Button label="Criar meu grupo" onPress={() => track('create_started', { origem: 'home' })} />
          </Link>
          <Link href="/entrar" asChild>
            <Button label="Tenho um convite" variant="ghost" />
          </Link>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo height={44} />
        {profile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sair da conta de ${profile.name}`}
            onPress={async () => {
              await signOut();
              setProfile(null);
              setGroups([]);
            }}
            hitSlop={8}
          >
            <T size={13} color={colors.textSecondary}>
              {profile.name} · <T size={13} weight="semibold">sair</T>
            </T>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexGrow: 1, justifyContent: 'center', gap: 20, paddingVertical: 32 }}>
        <View style={{ width: 132, height: 132, borderRadius: 32, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }}>
          <BrandSymbol size={92} />
        </View>
        <Title size={36}>Bora organizar o amigo oculto?</Title>
        <Sub>A surpresa fica. A complicação sai. Você monta o grupo e cada um descobre quem tirou por um link no WhatsApp.</Sub>
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
