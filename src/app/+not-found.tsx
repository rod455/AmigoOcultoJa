import { Link } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Button, Logo, Screen, Sub, Title } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen
      padTop={28}
      footer={
        <Link href="/" asChild>
          <Button label="Ir para o início" />
        </Link>
      }
    >
      <Logo />
      <View style={{ flexGrow: 1, justifyContent: 'center', gap: 16 }}>
        <Title size={34}>Essa página não existe.</Title>
        <Sub>Confere o link que você recebeu? Ele começa com /g/ e tem um código de 6 letras.</Sub>
      </View>
    </Screen>
  );
}
