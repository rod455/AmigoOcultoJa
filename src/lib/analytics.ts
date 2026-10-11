import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import catalog from '@/content/eventos.json';
import { getAttribution } from './attribution';
import { randomHex } from './device';
import { getItem, setItem } from './storage';
import { isConfigured, supabase } from './supabase';

/**
 * Eventos de comportamento. Os nomes válidos estão em src/content/eventos.json,
 * com a pergunta que fez cada um nascer; evento novo entra lá primeiro (ver
 * docs/dados/como-medimos.md). Cada evento leva o aparelho (anon_id), a
 * versão do app, a origem e a campanha de chegada; a conta é carimbada pelo
 * servidor. Fatos que têm tabela (grupo sorteado, nome escolhido, lista
 * salva, clique de compra) se contam pela tabela, não pelo evento.
 */
export type EventName = keyof typeof catalog.eventos;

const ANON = 'aoj.anon_id';
export const NO_STORAGE = 'sem-armazenamento';

type Device = { anonId: string; isNew: boolean };
let device: Promise<Device> | null = null;

/** Id aleatório do aparelho, só para medir (diferente da chave secreta de participação). */
export function getDevice(): Promise<Device> {
  device ??= (async () => {
    const v = await getItem(ANON);
    if (v) return { anonId: v, isNew: false };
    const id = randomHex(16);
    await setItem(ANON, id);
    // modo privado e WebViews que não guardam: não vira "uma pessoa" no banco
    const back = await getItem(ANON);
    return back === id ? { anonId: id, isNew: true } : { anonId: NO_STORAGE, isNew: false };
  })();
  return device;
}

export const appVersion: string | null = Constants.expoConfig?.version ?? null;
export const appBuild: string | null =
  Platform.OS === 'web' ? (process.env.EXPO_PUBLIC_COMMIT || '').slice(0, 7) || null : Application.nativeBuildVersion;
/** preview = build de teste interno ou desenvolvimento: fica fora das leituras */
export const appProfile: string | null = process.env.EXPO_PUBLIC_APP_PROFILE || (__DEV__ ? 'preview' : null);

export function track(
  name: EventName,
  props?: Record<string, unknown>,
  ctx?: { code?: string; participantId?: string; origin?: string },
): void {
  if (!isConfigured) return;
  const origin = ctx?.origin ?? (typeof props?.origem === 'string' ? props.origem : null);
  Promise.all([getDevice(), getAttribution()])
    .then(([d, utm]) =>
      supabase().rpc('rpc_track', {
        p_name: name,
        p_props: props ?? null,
        p_code: ctx?.code ?? null,
        p_participant_id: ctx?.participantId ?? null,
        p_platform: Platform.OS,
        p_anon_id: d.anonId,
        p_app_version: appVersion,
        p_build: appBuild,
        p_origin: origin,
        p_utm: utm,
        p_profile: appProfile,
      }),
    )
    .then(
      () => undefined,
      () => undefined, // nunca quebra a UI por medição
    );
}
