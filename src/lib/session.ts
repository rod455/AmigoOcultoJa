import { AppState, Platform } from 'react-native';
import { getDevice, track } from './analytics';
import { getAttribution } from './attribution';

/**
 * "session_started": uma vez por visita. No web, por aba (sessionStorage);
 * no app, ao abrir e ao voltar depois de 30 minutos em segundo plano.
 */
const IDLE_MS = 30 * 60 * 1000;
let started = false;

function emit(path: string, reason: 'abriu' | 'voltou'): void {
  // a campanha precisa ser lida antes de qualquer navegação limpar a URL
  void getAttribution();
  void getDevice().then((d) => track('session_started', { novo: d.isNew, motivo: reason }, { origin: path }));
}

export function startSession(path: string): void {
  if (started) return;
  started = true;
  if (Platform.OS === 'web') {
    try {
      if (window.sessionStorage.getItem('aoj.session')) return;
      window.sessionStorage.setItem('aoj.session', '1');
    } catch {
      // sem sessionStorage: conta a visita mesmo assim
    }
    emit(path, 'abriu');
    return;
  }
  emit(path, 'abriu');
  let backgroundAt = 0;
  AppState.addEventListener('change', (s) => {
    if (s === 'background') backgroundAt = Date.now();
    else if (s === 'active' && backgroundAt && Date.now() - backgroundAt > IDLE_MS) {
      backgroundAt = 0;
      emit('', 'voltou');
    }
  });
}
