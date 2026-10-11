import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { getJSON, setJSON } from './storage';
import { type Attribution, parseAttribution, parseInstallReferrer } from './utm';

/**
 * Primeira chegada com sinal (campanha, clique pago ou site de origem): fica
 * guardada no aparelho e vai em todo evento, até a conta. Chegada direta não
 * apaga uma campanha anterior; uma campanha nova também não troca a primeira.
 */
const KEY = 'aoj.attribution';
let cached: Promise<Attribution | null> | null = null;

export function getAttribution(): Promise<Attribution | null> {
  cached ??= capture();
  return cached;
}

async function capture(): Promise<Attribution | null> {
  const stored = await getJSON<Attribution | null>(KEY, null);
  if (stored) return stored;
  let found: Attribution | null = null;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      found = parseAttribution(window.location.search, document.referrer, window.location.pathname);
    } else if (Platform.OS === 'android') {
      found = parseInstallReferrer(await Application.getInstallReferrerAsync());
    }
  } catch {
    found = null;
  }
  if (found) {
    found.at = new Date().toISOString();
    await setJSON(KEY, found);
  }
  return found;
}
