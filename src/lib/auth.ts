import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { track } from './analytics';
import { baseUrl } from './share';
import { getItem, removeItem, setItem } from './storage';
import { anonKeyValue, isConfigured, supabase, supabaseUrl } from './supabase';

/**
 * Conta do organizador. Só guardamos nome e e-mail (vêm do Google/Apple ou do
 * formulário). Participantes continuam sem conta: o link basta.
 */
export type Profile = { id: string; email: string | null; name: string };

export type Provider = 'google' | 'apple';

export function profileFromUser(u: User): Profile {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.full_name ?? meta.name ?? meta.display_name ?? '').trim() || (u.email ? u.email.split('@')[0] : 'Você');
  return { id: u.id, email: u.email ?? null, name };
}

export async function getSession(): Promise<Session | null> {
  if (!isConfigured) return null;
  try {
    const { data } = await supabase().auth.getSession();
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<Profile | null> {
  const s = await getSession();
  return s?.user ? profileFromUser(s.user) : null;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!isConfigured) return () => undefined;
  const { data } = supabase().auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Quais logins sociais estão ligados no Supabase (Authentication › Providers).
 * Assim o botão só aparece quando o provedor funciona; ligar a Apple no painel
 * faz o botão surgir sem novo deploy.
 */
export type EnabledProviders = Record<Provider, boolean>;
export const DEFAULT_PROVIDERS: EnabledProviders = { google: true, apple: false };
let providersPromise: Promise<EnabledProviders> | null = null;

export function enabledProviders(): Promise<EnabledProviders> {
  if (!isConfigured) return Promise.resolve(DEFAULT_PROVIDERS);
  providersPromise ??= fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonKeyValue } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((s: { external?: Partial<Record<string, boolean>> }) => ({
      google: Boolean(s.external?.google),
      apple: Boolean(s.external?.apple),
    }))
    .catch(() => {
      providersPromise = null;
      return DEFAULT_PROVIDERS;
    });
  return providersPromise;
}

/** URL para onde o provedor devolve o usuário depois do login. */
function redirectUrl(next: string): string {
  if (Platform.OS === 'web') return `${baseUrl()}${next.startsWith('/') ? next : `/${next}`}`;
  return Linking.createURL('auth');
}

/**
 * No app, todo link de e-mail (confirmação, nova senha) volta em
 * `amigoocultoja://auth?code=...`, sempre o mesmo endereço (é o que está na
 * lista de URLs do Supabase). O destino depois do login fica guardado aqui e
 * a rota `/auth` o lê.
 */
const PENDING_NEXT = 'aoj.auth_next';

async function rememberNext(next: string): Promise<void> {
  if (Platform.OS !== 'web') await setItem(PENDING_NEXT, next);
}

export async function takePendingNext(): Promise<string | null> {
  const v = await getItem(PENDING_NEXT);
  if (v) await removeItem(PENDING_NEXT);
  return v && v.startsWith('/') ? v : null;
}

/** Login pelo navegador do sistema em andamento: a rota `/auth` não deve trocar o código de novo. */
let oauthInFlight = false;
export function isOAuthInFlight(): boolean {
  return oauthInFlight;
}

/** Troca o código do link pela sessão. Se outra parte do app já trocou, a sessão existente basta. */
export async function exchangeCode(code: string): Promise<boolean> {
  const { error } = await supabase().auth.exchangeCodeForSession(code);
  if (!error) return true;
  return Boolean(await getSession());
}

/**
 * Google / Apple via Supabase Auth.
 * Web: redireciona a página inteira e volta em `next` com a sessão.
 * App: abre o navegador do sistema e troca o código pela sessão.
 */
export async function signInWithProvider(provider: Provider, next: string): Promise<{ redirected: boolean }> {
  const redirectTo = redirectUrl(next);
  track('auth_started', { metodo: provider });
  if (Platform.OS === 'web') {
    const { error } = await supabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo, queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined },
    });
    if (error) throw error;
    return { redirected: true };
  }
  const { data, error } = await supabase().auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('Sem URL de login');
  oauthInFlight = true;
  try {
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') throw new Error('CANCELLED');
    const { queryParams } = Linking.parse(res.url);
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    if (!code) throw new Error('Login não concluído');
    if (!(await exchangeCode(code))) throw new Error('Login não concluído');
  } finally {
    oauthInFlight = false;
  }
  track('auth_completed', { metodo: provider });
  return { redirected: false };
}

/**
 * Entrar com a Apple só existe no iPhone, pela folha nativa do sistema (a
 * Apple exige essa opção quando o app oferece Google). O Supabase valida o
 * token com o bundle id em Authentication › Providers › Apple › Client IDs.
 */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<Profile> {
  track('auth_started', { metodo: 'apple' });
  let cred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new Error('CANCELLED');
    throw e;
  }
  if (!cred.identityToken) throw new Error('Login não concluído');
  const { data, error } = await supabase().auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
  if (error) throw error;
  // a Apple só manda o nome no primeiro login; guardamos na conta
  const fullName = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ').trim();
  let user = data.user;
  if (fullName && user && !(user.user_metadata as Record<string, unknown> | undefined)?.full_name) {
    const upd = await supabase().auth.updateUser({ data: { full_name: fullName } });
    if (upd.data.user) user = upd.data.user;
  }
  track('auth_completed', { metodo: 'apple' });
  return profileFromUser(user);
}

export async function signInWithEmail(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  track('auth_completed', { metodo: 'email' });
  return profileFromUser(data.user);
}

/** Cria a conta. Se o projeto exigir confirmação de e-mail, não há sessão ainda. */
export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
  next = '/criar/valor?auto=1',
): Promise<{ profile: Profile | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim() }, emailRedirectTo: redirectUrl(next) },
  });
  await rememberNext(next);
  if (error) throw error;
  if (data.session && data.user) {
    track('auth_completed', { metodo: 'email_signup' });
    return { profile: profileFromUser(data.user), needsConfirmation: false };
  }
  track('auth_pending_confirmation', { metodo: 'email_signup' });
  return { profile: null, needsConfirmation: true };
}

export async function resetPassword(email: string): Promise<void> {
  await rememberNext('/conta?mode=reset');
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirectUrl('/conta?mode=reset') });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  try {
    await supabase().auth.signOut();
  } catch {
    // ignora
  }
}

/**
 * Exclui a conta (exigência da App Store e da Play). Os grupos continuam
 * funcionando para os outros participantes; só deixam de estar ligados a
 * você. Ver `rpc_delete_my_account`.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase().rpc('rpc_delete_my_account');
  if (error) throw error;
  await signOut();
}

/** Mensagens de erro de auth em português. */
export function authErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (/CANCELLED/.test(msg)) return 'Login cancelado.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar. Procure o link na caixa de entrada.';
  if (/already registered|already exists/i.test(msg)) return 'Esse e-mail já tem conta. Toque em "Entrar".';
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return 'Esse login ainda não está ativado. Use e-mail e senha por enquanto.';
  if (/fetch|network/i.test(msg)) return 'Sem conexão. Verifique a internet e tente de novo.';
  return msg || 'Não deu para entrar. Tenta de novo?';
}
