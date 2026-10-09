import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, ErrorText, Label, Screen, Title, TopBar, UnderlineInput } from '@/components/ui';

function extractCode(input: string): string | null {
  const m = input.match(/\/g\/([A-Za-z0-9]{6})/) ?? input.match(/\b([A-Za-z0-9]{6})\b/);
  if (!m) return null;
  return m[1].toUpperCase();
}

/** "Tenho um convite": cola o link ou digita o código. */
export default function Entrar() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const code = extractCode(value);

  const go = () => {
    if (!code) {
      setError('Cole o link que você recebeu ou digite o código de 6 letras.');
      return;
    }
    router.push({ pathname: '/g/[codigo]', params: { codigo: code } });
  };

  return (
    <Screen top={<TopBar backTo="/" />} footer={<Button label="Entrar no grupo" onPress={go} disabled={!code} />}>
      <View style={{ gap: 28, paddingTop: 40 }}>
        <Title>Qual é o seu convite?</Title>
        <View style={{ gap: 8 }}>
          <Label>Link ou código do grupo</Label>
          <UnderlineInput
            big
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="amigoocultoja.com.br/g/ABC123"
            value={value}
            onChangeText={(t) => {
              setValue(t);
              setError('');
            }}
            onSubmitEditing={go}
            returnKeyType="go"
          />
          <ErrorText>{error}</ErrorText>
        </View>
      </View>
    </Screen>
  );
}
