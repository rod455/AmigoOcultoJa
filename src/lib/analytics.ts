import { Platform } from 'react-native';
import { isConfigured, supabase } from './supabase';

/**
 * Eventos da spec §10. Hoje gravam na tabela `events` do Supabase; trocar o
 * sink por PostHog/Firebase não muda os nomes.
 */
export function track(name: string, props?: Record<string, unknown>, ctx?: { code?: string; participantId?: string }): void {
  if (!isConfigured) return;
  try {
    void supabase()
      .rpc('rpc_track', {
        p_name: name,
        p_props: props ?? null,
        p_code: ctx?.code ?? null,
        p_participant_id: ctx?.participantId ?? null,
        p_platform: Platform.OS,
      })
      .then(() => undefined, () => undefined);
  } catch {
    // nunca quebra a UI por analytics
  }
}
