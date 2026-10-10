import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { type TextInput, View } from 'react-native';
import { Close, Plus } from '@/components/icons';
import { Button, ErrorText, IconButton, Label, Row, Screen, T, Title, TopBar, UnderlineInput } from '@/components/ui';
import { useDraft } from '@/features/create/useDraft';
import { track } from '@/lib/analytics';
import { getProfile } from '@/lib/auth';
import { colors } from '@/theme/tokens';

const MIN = 3;
const MAX = 50;

function normalize(n: string) {
  return n.trim().replace(/\s+/g, ' ');
}

/**
 * Tela 3 — Participantes (SPessoas).
 * Primeiro quem organiza digita o próprio nome (também entra no sorteio);
 * depois adiciona os outros participantes.
 */
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

  // Começa pelo campo do próprio nome.
  useEffect(() => {
    if (!ready || draft.organizerName) return;
    const t = setTimeout(() => meRef.current?.focus(), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Já logado (voltou para editar)? Sugere o nome da conta.
  useEffect(() => {
    if (!ready || draft.organizerName) return;
    let alive = true;
    getProfile().then((p) => {
      if (alive && p?.name && p.name !== 'Você') update((d) => (d.organizerName ? {} : { organizerName: p.name }));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const organizerOk = normalize(draft.organizerName).length >= 2;
  const all = [normalize(draft.organizerName), ...draft.participants].filter(Boolean);
  const total = all.length;
  const canContinue = organizerOk && total >= MIN;

  const exists = (name: string) => all.some((p) => p.toLowerCase() === name.toLowerCase());

  const askMyName = () => {
    setMeError(true);
    setError('Comece pelo seu nome. Você também participa do sorteio!');
    meRef.current?.focus();
  };

  const add = () => {
    const n = normalize(adding);
    if (!n) return;
    if (!organizerOk) {
      askMyName();
      return;
    }
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

  const next = () => {
    if (!organizerOk) {
      askMyName();
      return;
    }
    if (total < MIN) return;
    track('participants_set', { quantidade: total });
    router.push('/criar/valor');
  };

  const missing = MIN - total;
  const buttonLabel = !organizerOk
    ? 'Digite seu nome para continuar'
    : total >= MIN
      ? `Continuar com ${total} pessoas`
      : `Adicione mais ${missing} ${missing === 1 ? 'pessoa' : 'pessoas'}`;

  return (
    <Screen
      top={<TopBar step={2} total={3} backTo="/criar/nome" />}
      footer={
        <View style={{ gap: 8 }}>
          <ErrorText>{error}</ErrorText>
          <Button label={buttonLabel} onPress={next} disabled={organizerOk && !canContinue} />
        </View>
      }
    >
      <View style={{ gap: 28, paddingTop: 28 }}>
        <Title>Quem vai participar?</Title>

        {/* 1. quem organiza */}
        <View style={{ gap: 6 }}>
          <Label nativeID="lbl-me">Primeiro, o seu nome</Label>
          <UnderlineInput
            ref={meRef}
            value={draft.organizerName}
            onChangeText={(t) => {
              update({ organizerName: t });
              if (normalize(t).length >= 2) {
                setMeError(false);
                setError('');
              }
            }}
            placeholder="Seu nome e sobrenome"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => inputRef.current?.focus()}
            accessibilityLabelledBy="lbl-me"
            style={meError && !organizerOk ? { borderBottomColor: colors.accent } : undefined}
          />
          <T size={13} color={colors.textSecondary}>
            Você também entra no sorteio.
          </T>
        </View>

        {/* 2. os outros */}
        <View style={{ gap: 6 }}>
          <Label nativeID="lbl-others">Agora, quem mais vai participar</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderBottomColor: colors.text }}>
            <UnderlineInput
              ref={inputRef}
              style={{ flexGrow: 1, borderBottomWidth: 0, minWidth: 0 }}
              value={adding}
              onChangeText={(t) => {
                setAdding(t);
                if (organizerOk) setError('');
              }}
              placeholder="Nome e sobrenome"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={add}
              accessibilityLabelledBy="lbl-others"
            />
            <IconButton label="Adicionar pessoa" onPress={add} size={40} bg={colors.text}>
              <Plus />
            </IconButton>
          </View>

          {draft.participants.length > 0 ? (
            <View style={{ paddingTop: 6 }}>
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
              <T size={13} color={colors.textSecondary} style={{ paddingTop: 10 }}>
                {total} {total === 1 ? 'pessoa' : 'pessoas'} no sorteio, contando você.
              </T>
            </View>
          ) : (
            <T size={13} color={colors.textSecondary} style={{ paddingTop: 4 }}>
              Digite um nome e toque em + para adicionar. Precisa de pelo menos {MIN} pessoas, contando você.
            </T>
          )}
        </View>
      </View>
    </Screen>
  );
}
