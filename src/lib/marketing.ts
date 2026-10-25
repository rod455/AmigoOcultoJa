import type { EventName } from './analytics';

/**
 * No app, os eventos de campanha vão para o Firebase Analytics (ligado em
 * src/lib/firebase.ts quando o projeto tem os arquivos do Firebase). A versão
 * do site, com a tag do Google, está em marketing.web.ts.
 */
export function mirror(name: EventName, props?: Record<string, unknown>): void {
  // preenchido pelo Firebase (ver firebase.ts)
  nativeMirror?.(name, props);
}

let nativeMirror: ((name: EventName, props?: Record<string, unknown>) => void) | null = null;
export function setNativeMirror(fn: typeof nativeMirror): void {
  nativeMirror = fn;
}

export type Consent = 'granted' | 'denied';
export function storedConsent(): Consent | null {
  return null;
}
export function setConsent(_choice: Consent): void {}
export function clearConsent(): void {}
