import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Close, Plus } from '@/components/icons';
import { Button, ErrorText, IconButton, Row, Screen, T, Title, TopBar, UnderlineInput } from '@/components/ui';
import { useDraft } from '@/features/create/useDraft';
import { track } from '@/lib/analytics';
import { colors, fonts } from '@/theme/tokens';

const MIN = 3;
const MAX = 50;

function normalize(n: string) {
  return n.trim().replace(/\s+/g, ' ');
}

/** Tela 3 — Participantes (SPessoas) */
export default function Pessoas() {
  const { draft, update, ready } = useDraft();
  const [adding, setAdding] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const meRef = useRef<TextInput>(null);
  const [meError, setMeError] = useState(false);

  useEffect(() => {
    if (ready && !draft.name) router.replace('/criar/nome');
  }, [ready, draft.name]);

  const all = [draft.organizerName, ...draft.participants].filter(Boolean);
  const total = all.length;

  const exists = (name: string) => all.some((p) => p.toLowerCase() === name.toLowerCase());

  const add = () => {
    const n = normalize(adding);
    if (!n) return;
    if (exists(n)) {
      setError(`Já tem ${n} na lista. Inclua o sobrenome para diferenciar.`);
      return;
    }
    if (total >= MAX) {
      setError(`O máximo é ${MAX} pessoas.`);
      return;
    }
    update((d) => ({ participants: [...d.participants, n] }));
    setAdding('');
    setError('');
    inputRef.current?.focus();
  };

  const remove = (idx: number) => {
    update((d) => ({ participants: d.participants.filter((_, i) => i !== idx), exclusions: [] }));
  };

  const organizerOk = normalize(draft.organizerName).length >= 2;
  const canContinue = total >= MIN;

  const next = () => {
    if (!canContinue) return;
    if (!organizerOk) {
      // o organizador também participa: pede o nome em vez de só travar o botão
      setMeError(true);
      setError('Falta o seu nome. Você também participa do sorteio!');
      meRef.current?.focus();
      return;
    }
    track('participants_set', { quantidade: total });
    router.push('/criar/valor');
  };

  return (
    <Screen
      top={<TopBar step={2} total={3} backTo="/criar/nome" />}
      footer={
        <View style={{ gap: 8 }}>
          <ErrorText>{error}</ErrorText>
          <Button
            label={total >= MIN ? `Continuar com ${total} pessoas` : `Adicione mais ${MIN - total} ${MIN - total === 1 ? 'pessoa' : 'pessoas'}`}
            onPress={next}
            disabled={!canContinue}
          />
        </View>
      }
    >
      <View style={{ gap: 22, paddingTop: 28 }}>
        <Title>Quem vai participar?</Title>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderBottomColor: colors.text }}>
          <UnderlineInput
            ref={inputRef}
            style={{ flexGrow: 1, borderBottomWidth: 0, minWidth: 0 }}
            value={adding}
            onChangeText={(t) => {
              setAdding(t);
              setError('');
            }}
            placeholder="Nome e sobrenome"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={add}
            accessibilityLabel="Nome e sobrenome"
          />
          <IconButton label="Adicionar pessoa" onPress={add} size={40} bg={colors.text}>
            <Plus />
          </IconButton>
        </View>

        <View>
          <Row style={meError && !organizerOk ? { borderBottomColor: colors.accent, borderBottomWidth: 2 } : undefined}>
            <TextInput
              ref={meRef}
              value={draft.organizerName}
              onChangeText={(t) => {
                update({ organizerName: t });
                if (t.trim().length >= 2) {
                  setMeError(false);
                  setError('');
                }
              }}
              placeholder="Seu nome e sobrenome"
              placeholderTextColor={meError && !organizerOk ? colors.accentDark : colors.textMuted}
              autoCapitalize="words"
              style={{ flexGrow: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text, paddingVertical: 0, height: 52 }}
              accessibilityLabel="Seu nome"
            />
            <T size={14} weight={organizerOk ? 'regular' : 'bold'} color={organizerOk ? colors.textSecondary : colors.accentDark} style={{ paddingRight: 12 }}>
              {organizerOk ? 'você' : 'você (falta)'}
            </T>
          </Row>
          {draft.participants.map((p, i) => (
            <Row key={`${p}-${i}`}>
              <T size={17} style={{ flexGrow: 1 }}>
                {p}
              </T>
              <IconButton label={`Remover ${p}`} onPress={() => remove(i)}>
                <Close />
              </IconButton>
            </Row>
          ))}
        </View>
        {draft.participants.length === 0 ? (
          <T size={14} color={colors.textSecondary}>
            Digite um nome e toque em + para adicionar. Precisa de pelo menos {MIN} pessoas, contando você.
          </T>
        ) : null}
      </View>
    </Screen>
  );
}
