import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

const isBrowser = Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Cliente Supabase criado sob demanda (evita tocar em storage durante o
 * export estático). A sessão do organizador fica persistida: localStorage no
 * web, AsyncStorage no app.
 */
export function supabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }
    client = createClient(url, anonKey, {
      auth: {
        persistSession: isBrowser || Platform.OS !== 'web',
        autoRefreshToken: true,
        detectSessionInUrl: isBrowser,
        flowType: 'pkce',
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      },
    });
  }
  return client;
}

export const isConfigured = Boolean(url && anonKey);

export const functionsUrl = url ? `${url}/functions/v1` : '';
export const anonKeyValue = anonKey;
export const supabaseUrl = url;
