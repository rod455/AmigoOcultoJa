import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { track } from './analytics';
import { baseUrl } from './share';
import { isConfigured, supabase } from './supabase';

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

/** URL para onde o provedor devolve o usuário depois do login. */
function redirectUrl(next: string): string {
  if (Platform.OS === 'web') return `${baseUrl()}${next.startsWith('/') ? next : `/${next}`}`;
  return Linking.createURL('auth');
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
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') throw new Error('CANCELLED');
  const { queryParams } = Linking.parse(res.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) throw new Error('Login não concluído');
  const { error: exErr } = await supabase().auth.exchangeCodeForSession(code);
  if (exErr) throw exErr;
  track('auth_completed', { metodo: provider });
  return { redirected: false };
}

export async function signInWithEmail(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  track('auth_completed', { metodo: 'email' });
  return profileFromUser(data.user);
}

/** Cria a conta. Se o projeto exigir confirmação de e-mail, não há sessão ainda. */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<{ profile: Profile | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim() }, emailRedirectTo: redirectUrl('/criar/valor?auto=1') },
  });
  if (error) throw error;
  if (data.session && data.user) {
    track('auth_completed', { metodo: 'email_signup' });
    return { profile: profileFromUser(data.user), needsConfirmation: false };
  }
  track('auth_pending_confirmation', { metodo: 'email_signup' });
  return { profile: null, needsConfirmation: true };
}

export async function resetPassword(email: string): Promise<void> {
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
