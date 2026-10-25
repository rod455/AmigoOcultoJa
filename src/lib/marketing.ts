import type { EventName } from './analytics';
import { toGaEvent } from './marketing-events';

/**
 * No app, os eventos de campanha e as telas vão para o Firebase Analytics.
 * O módulo nativo só entra na build quando o projeto tem os arquivos do
 * Firebase (native-services.js); sem ele, tudo aqui é silencioso. A versão do
 * site, com a tag do Google, está em marketing.web.ts.
 */
type Firebase = {
  mod: {
    getAnalytics: () => unknown;
    logEvent: (a: unknown, name: string, params?: Record<string, unknown>) => unknown;
    logScreenView: (a: unknown, p: { screen_name: string; screen_class: string }) => Promise<void>;
  };
  analytics: unknown;
};
let fb: Firebase | null | undefined;

function firebase(): Firebase | null {
  if (fb !== undefined) return fb;
  try {
    // dentro do try: sem o Firebase na build, o módulo nativo não existe e cai no catch
    const mod = require('@react-native-firebase/analytics') as Firebase['mod'];
    fb = { mod, analytics: mod.getAnalytics() };
  } catch {
    fb = null;
  }
  return fb;
}

export function mirror(name: EventName, props?: Record<string, unknown>): void {
  const ev = toGaEvent(name, props);
  const f = ev ? firebase() : null;
  if (!f || !ev) return;
  try {
    void Promise.resolve(f.mod.logEvent(f.analytics, ev.name, ev.params)).catch(() => undefined);
  } catch {
    // medição nunca quebra a UI
  }
}

/** Tela atual (o Firebase não vê as rotas do Expo Router sozinho). */
export function screenView(pathname: string): void {
  const f = firebase();
  if (!f) return;
  // sem códigos de grupo nem ids: /g/ABC123 vira /g/[codigo]
  const screen = pathname.replace(/^\/(g|painel|pronto)\/[^/]+/, '/$1/[codigo]').replace(/^\/(r|empresas\/lote)\/[^/]+/, '/$1/[id]');
  f.mod.logScreenView(f.analytics, { screen_name: screen, screen_class: screen }).catch(() => undefined);
}

export type Consent = 'granted' | 'denied';
export function storedConsent(): Consent | null {
  return null;
}
export function setConsent(_choice: Consent): void {}
export function clearConsent(): void {}
