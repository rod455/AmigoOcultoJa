import { Linking, Platform } from 'react-native';
import { formatBRL, formatDay } from './format';

export function baseUrl(): string {
  const env = process.env.EXPO_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'https://amigoocultoja.com.br';
}

export function inviteUrl(code: string): string {
  return `${baseUrl()}/g/${code.toUpperCase()}`;
}

/** Mensagem da tela 5 (spec §6.1) */
export function inviteMessage(opts: { groupName: string; code: string; budgetCents: number | null; exchangeAt: string | null }): string {
  const lines = [`Amigo oculto do *${opts.groupName}* tá valendo!`];
  const meta: string[] = [];
  if (opts.budgetCents != null) meta.push(`Valor: até ${formatBRL(opts.budgetCents)}`);
  if (opts.exchangeAt) meta.push(`Troca: ${formatDay(opts.exchangeAt)}`);
  if (meta.length) lines.push(meta.join(' · '));
  lines.push('');
  lines.push('Toque no link, escolha seu nome e descubra quem você tirou:');
  lines.push(inviteUrl(opts.code));
  return lines.join('\n');
}

/** Lembrete do organizador para quem ainda não abriu (P0-11) */
export function reminderMessage(opts: { groupName: string; code: string; names: string[] }): string {
  const who = opts.names.length ? `${opts.names.join(', ')}: ` : '';
  return [
    `${who}ainda falta você no amigo oculto do *${opts.groupName}*!`,
    'Toque no link, escolha seu nome e veja quem você tirou:',
    inviteUrl(opts.code),
  ].join('\n');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function openWhatsApp(text: string): Promise<void> {
  const url = whatsappUrl(text);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await Linking.openURL(url);
}
