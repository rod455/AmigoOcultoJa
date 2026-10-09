import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from '@/components/icons';
import { Button, ErrorText, Logo, Screen, T, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { claim, friendlyError, type PublicGroup } from '@/lib/api';
import { firstName, groupMeta } from '@/lib/format';
import { colors, fonts } from '@/theme/tokens';

/** Tela 7 — Quem é você? (SEntrar) */
export function EnterScreen({ group, onClaimed }: { group: PublicGroup; onClaimed: (participantId: string) => Promise<void> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chosen = group.participants.find((p) => p.id === selected);

  const go = async () => {
    if (!chosen) return;
    setLoading(true);
    setError('');
    try {
      const r = await claim(group.code, chosen.id);
      track('participant_claimed', undefined, { code: group.code, participantId: r.participant_id });
      await onClaimed(r.participant_id);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      padTop={28}
      footer={
        <View style={{ gap: 10 }}>
          <ErrorText>{error}</ErrorText>
          <Button label={chosen ? `Ver quem eu tirei` : 'Toque no seu nome'} onPress={go} disabled={!chosen} loading={loading} />
        </View>
      }
    >
      <Logo height={32} />
      <View style={{ gap: 24, paddingTop: 32 }}>
        <View style={{ gap: 6 }}>
          <T size={16} color={colors.textSecondary}>
            {group.organizer_name ? `${firstName(group.organizer_name)} te chamou para o` : 'Você foi chamado para o'}
          </T>
          <Title>{group.name}</Title>
          <T size={16} color={colors.textSecondary}>
            {groupMeta(group.budget_cents, group.exchange_at)}
          </T>
        </View>

        <View>
          <T size={14} weight="semibold" color={colors.textSecondary} style={{ paddingBottom: 4 }}>
            Toque no seu nome
          </T>
          {group.participants.map((p) => {
            const on = selected === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: p.claimed }}
                disabled={p.claimed}
                onPress={() => setSelected(on ? null : p.id)}
                style={({ pressed }) => ({ opacity: pressed && !p.claimed ? 0.8 : 1 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 }}>
                  <T size={17} color={p.claimed ? colors.textMuted : colors.text} style={{ flexGrow: 1, fontFamily: on ? fonts.bold : fonts.regular }}>
                    {p.display_name}
                  </T>
                  {p.claimed ? (
                    <T size={14} color={colors.textMuted}>
                      já entrou
                    </T>
                  ) : on ? (
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <T size={13} color={colors.textSecondary} lineHeight={18}>
          Depois de escolher, seu nome fica ligado a este aparelho e ninguém mais consegue abrir o seu resultado. Se o seu nome aparece como "já entrou" e não foi você, fale com quem organizou.
        </T>
      </View>
    </Screen>
  );
}
