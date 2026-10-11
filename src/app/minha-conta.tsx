import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, ErrorText, Screen, Sub, T, Title, TopBar } from '@/components/ui';
import { CONTACT_EMAIL } from '@/features/legal/LegalPage';
import { authErrorMessage, deleteAccount, getProfile, type Profile, signOut } from '@/lib/auth';
import { colors } from '@/theme/tokens';

/**
 * "/minha-conta" — sair e excluir a conta. A App Store e a Play exigem que a
 * exclusão esteja dentro do app; este mesmo endereço vai no formulário da
 * Play como "URL para pedir exclusão da conta".
 */
export default function MinhaConta() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteAccount();
      setDeleted(true);
      setProfile(null);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (deleted) {
    return (
      <Screen top={<TopBar backTo="/" />} padTop={12} footer={<Button label="Voltar para o início" onPress={() => router.replace('/')} />}>
        <View style={{ gap: 12, paddingTop: 12 }}>
          <Title size={28}>Conta excluída</Title>
          <Sub>Apagamos seu nome, e-mail e login. Os grupos que você criou continuam funcionando para quem participa, sem ligação com você.</Sub>
        </View>
      </Screen>
    );
  }

  if (profile === undefined) return <Screen top={<TopBar backTo="/" />} padTop={12}>{null}</Screen>;

  if (!profile) {
    return (
      <Screen
        top={<TopBar backTo="/" />}
        padTop={12}
        footer={<Button label="Entrar na minha conta" onPress={() => router.push({ pathname: '/conta', params: { mode: 'login', next: '/minha-conta' } })} />}
      >
        <View style={{ gap: 12, paddingTop: 12 }}>
          <Title size={28}>Sua conta</Title>
          <Sub>Entre para ver ou excluir sua conta. Se não conseguir entrar, peça a exclusão por e-mail para {CONTACT_EMAIL}, usando o endereço da conta.</Sub>
          <Sub>Quem só participa de um grupo não tem conta: o link basta, e não há nada para excluir aqui.</Sub>
        </View>
      </Screen>
    );
  }

  return (
    <Screen top={<TopBar backTo="/" />} padTop={12}>
      <View style={{ gap: 20, paddingTop: 12 }}>
        <View style={{ gap: 4 }}>
          <Title size={28}>Sua conta</Title>
          <T size={16} weight="semibold">
            {profile.name}
          </T>
          {profile.email ? (
            <T size={14} color={colors.textSecondary} selectable>
              {profile.email}
            </T>
          ) : null}
        </View>

        <Button
          label="Sair da conta"
          variant="outline"
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}
        />

        <View style={{ gap: 10, padding: 16, borderRadius: 16, backgroundColor: colors.surfaceAlt }}>
          <T size={16} weight="bold">
            Excluir minha conta
          </T>
          <T size={14} color={colors.textSecondary} lineHeight={20}>
            Apaga seu nome, e-mail e login, para sempre. Os grupos que você criou continuam funcionando para quem participa. Não dá para desfazer.
          </T>
          {confirming ? (
            <View style={{ gap: 8 }}>
              <Button label="Excluir para sempre" onPress={remove} loading={busy} />
              <Button label="Cancelar" variant="ghost" onPress={() => setConfirming(false)} disabled={busy} />
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
              <T size={15} weight="bold" color={colors.accent}>
                Quero excluir minha conta
              </T>
            </Pressable>
          )}
          <ErrorText>{error}</ErrorText>
        </View>

        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Link href="/privacidade">
            <T size={13} color={colors.textSecondary}>
              Privacidade
            </T>
          </Link>
          <Link href="/termos">
            <T size={13} color={colors.textSecondary}>
              Termos
            </T>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
