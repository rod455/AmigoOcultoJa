import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Label, Screen, Title, TopBar, UnderlineInput } from '@/components/ui';
import { useDraft } from '@/features/create/useDraft';
import { track } from '@/lib/analytics';

/** Tela 2 — Nome do grupo (SNome) */
export default function Nome() {
  const { draft, update, ready } = useDraft();
  const [name, setName] = useState('');

  useEffect(() => {
    if (ready) setName(draft.name);
  }, [ready, draft.name]);

  const valid = name.trim().length >= 2;

  const next = () => {
    if (!valid) return;
    update({ name: name.trim() });
    track('group_name_set');
    router.push('/criar/pessoas');
  };

  return (
    <Screen top={<TopBar step={1} total={3} backTo="/" />} footer={<Button label="Continuar" onPress={next} disabled={!valid} />}>
      <View style={{ gap: 28, paddingTop: 40 }}>
        <Title>Qual o nome do grupo?</Title>
        <View style={{ gap: 8 }}>
          <Label nativeID="lbl-nome">Nome do grupo</Label>
          <UnderlineInput
            big
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="Natal da Família"
            maxLength={60}
            returnKeyType="next"
            onSubmitEditing={next}
            accessibilityLabelledBy="lbl-nome"
          />
        </View>
      </View>
    </Screen>
  );
}
