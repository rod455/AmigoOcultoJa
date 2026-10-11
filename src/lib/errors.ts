import { Platform } from 'react-native';
import { appBuild, appProfile, appVersion, getDevice } from './analytics';
import { isConfigured, supabase } from './supabase';

/**
 * Erros de JavaScript do site e dos apps vão para public.app_errors, com tela,
 * plataforma, versão e aparelho. Crash nativo não passa por aqui: aparece nos
 * painéis das lojas (Play Console › Android vitals, App Store Connect › Crashes).
 */
let screen = '';
export function setCurrentScreen(path: string): void {
  screen = path;
}

const seen = new Set<string>();
let sent = 0;
const MAX_PER_SESSION = 15;

// ruído do navegador e de extensões, que não é defeito nosso
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /chrome-extension:|moz-extension:|safari-extension:/i, /Non-Error promise rejection captured/i];

export type ErrorKind = 'error' | 'promise' | 'render';

export function reportError(kind: ErrorKind, err: unknown, fatal = false): void {
  try {
    if (!isConfigured) return;
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : safeString(err));
    const message = (e.message || e.name || 'erro sem mensagem').slice(0, 500);
    const stack = (e.stack ?? '').slice(0, 4000);
    if (IGNORE.some((r) => r.test(message) || r.test(stack))) return;
    const key = `${kind}:${message}`;
    if (seen.has(key) || sent >= MAX_PER_SESSION) return;
    seen.add(key);
    sent += 1;
    void getDevice()
      .then((d) =>
        supabase().rpc('rpc_log_error', {
          p_kind: kind,
          p_message: message,
          p_stack: stack || null,
          p_screen: screen || null,
          p_fatal: fatal,
          p_platform: Platform.OS,
          p_app_version: appVersion,
          p_build: appBuild,
          p_profile: appProfile,
          p_anon_id: d.anonId,
        }),
      )
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    // o relatório de erro nunca pode virar outro erro
  }
}

function safeString(v: unknown): string {
  try {
    return JSON.stringify(v)?.slice(0, 500) ?? String(v);
  } catch {
    return String(v);
  }
}

let installed = false;

/** Liga a captura global uma vez: window.onerror/unhandledrejection no web, ErrorUtils no app. */
export function installErrorHandlers(): void {
  if (installed) return;
  installed = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (ev) => reportError('error', ev.error ?? ev.message));
    window.addEventListener('unhandledrejection', (ev) => reportError('promise', ev.reason));
    return;
  }
  type Handler = (error: unknown, isFatal?: boolean) => void;
  const eu = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => Handler; setGlobalHandler: (h: Handler) => void } }).ErrorUtils;
  if (!eu) return;
  const previous = eu.getGlobalHandler();
  eu.setGlobalHandler((error, isFatal) => {
    reportError('error', error, !!isFatal);
    previous(error, isFatal);
  });
}
