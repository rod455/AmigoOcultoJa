import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, type TextStyle, TextInput, View, type ViewStyle } from 'react-native';
import { AppleLogo, Eye, EyeOff, GoogleLogo } from '@/components/icons';
import { BrandSymbol, Button, ErrorText, Screen, T, TopBar } from '@/components/ui';
import { authErrorMessage, getSession, resetPassword, signInWithEmail, signInWithProvider, signUpWithEmail, updatePassword } from '@/lib/auth';
import { loadDraft } from '@/lib/device';
import { colors, fonts } from '@/theme/tokens';

type Mode = 'login' | 'signup' | 'reset';

/**
 * Tela de conta: Google, Apple ou e-mail + senha. Só pedimos nome e e-mail.
 * Aparece no momento de criar o grupo (depois de "Sortear"); o rascunho já
 * está salvo, então o usuário volta exatamente de onde parou.
 */
export default function Conta() {
  const params = useLocalSearchParams<{ next?: string; mode?: string }>();
  const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/criar/valor?auto=1';
  const [mode, setMode] = useState<Mode>(params.mode === 'reset' ? 'reset' : params.mode === 'login' ? 'login' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState<'' | 'google' | 'apple' | 'email'>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    // já logado → segue direto; nome do rascunho vira sugestão de nome da conta
    getSession().then((s) => {
      if (s && mode !== 'reset') router.replace(next as never);
    });
    loadDraft().then((d) => {
      if (d.organizerName) setName(d.organizerName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNext = () => router.replace(next as never);

  const provider = async (p: 'google' | 'apple') => {
    setBusy(p);
    setError('');
    try {
      const r = await signInWithProvider(p, next);
      if (!r.redirected) goNext();
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy('');
    }
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    mode === 'reset' ? password.length >= 6 : validEmail && password.length >= 6 && (mode === 'login' || name.trim().length >= 2);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy('email');
    setError('');
    setNotice('');
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        goNext();
      } else if (mode === 'signup') {
        const r = await signUpWithEmail(name, email, password);
        if (r.needsConfirmation) {
          // já deixa a aba de login pronta, com e-mail e senha preenchidos
          setMode('login');
          setNotice(`Enviamos um link para ${email.trim()}. Confirme pelo e-mail e você volta direto para o sorteio. Se preferir, confirme e depois toque em "Entrar e sortear" aqui.`);
        } else {
          goNext();
        }
      } else {
        await updatePassword(password);
        setNotice('Senha atualizada.');
        setTimeout(goNext, 800);
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const forgot = async () => {
    if (!validEmail) {
      setError('Digite seu e-mail acima para receber o link.');
      return;
    }
    setError('');
    try {
      await resetPassword(email);
      setNotice(`Enviamos um link para ${email.trim()} redefinir a senha.`);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  const title = mode === 'reset' ? 'Nova senha' : 'Salve seu amigo oculto';
  const subtitle =
    mode === 'reset'
      ? 'Escolha uma senha nova para a sua conta.'
      : 'Crie uma conta para sortear e acompanhar quem já viu. Pedimos só nome e e-mail.';

  return (
    <Screen top={<TopBar backTo="/criar/valor" />} padTop={12}>
      <View style={{ gap: 18, paddingTop: 8, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }}>
            <BrandSymbol size={44} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T size={24} weight="extrabold" lineHeight={28} style={{ letterSpacing: -0.5 }} accessibilityRole="header">
              {title}
            </T>
            <T size={14} color={colors.textSecondary} lineHeight={19}>
              {subtitle}
            </T>
          </View>
        </View>

        {mode !== 'reset' ? (
          <>
            <View style={{ gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => provider('google')}
                disabled={!!busy}
                style={[styles.oauth, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.lineStrong, opacity: busy && busy !== 'google' ? 0.6 : 1 }]}
              >
                <GoogleLogo />
                <T size={16} weight="semibold">
                  {busy === 'google' ? 'Abrindo o Google…' : 'Continuar com Google'}
                </T>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => provider('apple')}
                disabled={!!busy}
                style={[styles.oauth, { backgroundColor: colors.text, opacity: busy && busy !== 'apple' ? 0.6 : 1 }]}
              >
                <AppleLogo />
                <T size={16} weight="semibold" color="#FFFFFF">
                  {busy === 'apple' ? 'Abrindo a Apple…' : 'Continuar com Apple'}
                </T>
              </Pressable>
              <T size={12} color={colors.textSecondary} align="center">
                Rápido e sem precisar de senha
              </T>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
              <T size={13} color={colors.textSecondary}>
                ou com e-mail
              </T>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            </View>

            {/* alternador entrar / criar conta */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 3 }}>
              {(['signup', 'login'] as const).map((m) => {
                const on = mode === m;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setMode(m);
                      setError('');
                      setNotice('');
                    }}
                    style={{ flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent' }}
                  >
                    <T size={14} weight={on ? 'bold' : 'semibold'} color={on ? colors.text : colors.textSecondary}>
                      {m === 'signup' ? 'Criar conta' : 'Já tenho conta'}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={{ gap: 12 }}>
          {mode === 'signup' ? (
            <Field label="Nome">
              <TextInput value={name} onChangeText={setName} placeholder="Como te chamam" placeholderTextColor={colors.textMuted} autoCapitalize="words" autoComplete="name" textContentType="name" style={styles.input} />
            </Field>
          ) : null}
          {mode !== 'reset' ? (
            <Field label="E-mail">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@exemplo.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                style={styles.input}
              />
            </Field>
          ) : null}
          <Field label={mode === 'reset' ? 'Nova senha' : 'Senha'}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'login' ? 'Sua senha' : 'Pelo menos 6 caracteres'}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoComplete={mode === 'login' ? 'password' : 'new-password'}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                onSubmitEditing={submit}
                returnKeyType="go"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable accessibilityRole="button" accessibilityLabel={showPass ? 'Esconder senha' : 'Mostrar senha'} onPress={() => setShowPass((v) => !v)} hitSlop={8} style={{ width: 40, alignItems: 'center' }}>
                {showPass ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
              </Pressable>
            </View>
          </Field>
          {notice ? (
            <T size={14} color={colors.successText} lineHeight={20}>
              {notice}
            </T>
          ) : null}
          <ErrorText>{error}</ErrorText>
          <Button
            label={mode === 'login' ? 'Entrar e sortear' : mode === 'signup' ? 'Criar conta e sortear' : 'Salvar senha'}
            onPress={submit}
            disabled={!canSubmit}
            loading={busy === 'email'}
          />
          {mode === 'login' ? (
            <Pressable accessibilityRole="button" onPress={forgot} style={{ alignSelf: 'center', height: 40, justifyContent: 'center' }}>
              <T size={14} weight="semibold" color={colors.textSecondary}>
                Esqueci minha senha
              </T>
            </Pressable>
          ) : null}
        </View>

        <T size={12} color={colors.textSecondary} lineHeight={17} align="center">
          Usamos seu nome e e-mail só para guardar seus grupos. Quem participa não precisa de conta.
        </T>
      </View>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T size={13} weight="semibold" color={colors.textSecondary}>
        {label}
      </T>
      <View style={{ borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, minHeight: 50, justifyContent: 'center', backgroundColor: colors.surface }}>{children}</View>
    </View>
  );
}

const styles = {
  oauth: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 } as ViewStyle,
  input: {
    height: 48,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null),
  } as TextStyle,
};
