import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Armazenamento local simples. No web usa localStorage direto (síncrono e
 * disponível no primeiro render); no nativo usa AsyncStorage.
 */
const hasWindow = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (!hasWindow) return null;
      return window.localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (!hasWindow) return;
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignora: storage indisponível (modo privado, etc.)
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (!hasWindow) return;
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch {
    // ignora
  }
}

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}
