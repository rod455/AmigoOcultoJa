import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { onAuthChange } from '@/lib/auth';
import { loadDraft } from '@/lib/device';
import { isConfigured, supabase } from '@/lib/supabase';

/**
 * Web: quando o link de confirmação/recuperação devolve o usuário com
 * `?code=...` em qualquer página (inclusive a raiz, se a Site URL do Supabase
 * apontar para lá), troca o código pela sessão e leva para o sorteio
 * pendente. Sem isso o código ficaria na URL sem efeito.
 */
export function AuthUrlHandler() {
  useEffect(() => {
    if (Platform.OS !== 'web' || !isConfigured || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.has('code') || window.location.hash.includes('access_token=');
    if (!hasCode) return;
    const isRecovery = params.get('type') === 'recovery' || window.location.hash.includes('type=recovery');
    // instanciar o cliente dispara a troca do código (detectSessionInUrl)
    supabase();
    const off = onAuthChange((session) => {
      if (!session) return;
      off();
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
      if (isRecovery) {
        router.replace({ pathname: '/conta', params: { mode: 'reset' } });
        return;
      }
      loadDraft().then((d) => {
        if (d.name && d.organizerName) router.replace('/criar/valor?auto=1' as never);
        else if (clean === '/') router.replace('/app');
      });
    });
    return off;
  }, []);
  return null;
}
