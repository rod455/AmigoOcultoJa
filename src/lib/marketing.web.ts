import type { EventName } from './analytics';
import { ADS_SIGNUP, CONSENT_KEY, tagEnabled } from './marketing-config';
import { toGaEvent } from './marketing-events';
import { supabase } from './supabase';

/**
 * Espelha os eventos de campanha na tag do Google (GA4 e Google Ads). A tag é
 * carregada em src/app/+html.tsx, já com o Consent Mode v2 negado por padrão:
 * sem o "Aceitar" do aviso de cookies, o Google só recebe sinais sem cookie.
 * A versão do app (Firebase) está em marketing.ts.
 */
type Gtag = (...args: unknown[]) => void;
const gtag = (): Gtag | null => {
  const w = globalThis as unknown as { gtag?: Gtag };
  return tagEnabled && typeof w.gtag === 'function' ? w.gtag : null;
};

export function mirror(name: EventName, props?: Record<string, unknown>): void {
  const g = gtag();
  const ev = toGaEvent(name, props);
  if (!g || !ev) return;
  if (name === 'auth_completed') {
    void signUp(g, ev.params);
    return;
  }
  g('event', ev.name, ev.params);
}

/** Cadastro: e-mail para as Enhanced Conversions (o gtag faz o hash) e a conversão do Ads. */
async function signUp(g: Gtag, params: Record<string, string | number>) {
  try {
    const { data } = await supabase().auth.getSession();
    const email = data.session?.user?.email;
    if (email) g('set', 'user_data', { email: email.trim().toLowerCase() });
  } catch {
    // sem sessão legível: a conversão vai sem o e-mail
  }
  g('event', 'sign_up', params);
  if (ADS_SIGNUP) g('event', 'conversion', { send_to: ADS_SIGNUP });
}

export type Consent = 'granted' | 'denied';

export function storedConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: Consent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // sem armazenamento: vale só para esta visita
  }
  gtag()?.('consent', 'update', {
    analytics_storage: choice,
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
  });
}

export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // nada a limpar
  }
}
