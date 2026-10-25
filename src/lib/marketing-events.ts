import type { EventName } from './analytics';

/**
 * Quais dos nossos eventos (src/content/eventos.json) vão também para o
 * Google (GA4 no site, Firebase Analytics no app), e com que nome. Só o que
 * serve para campanha: o resto fica só no nosso banco. Parâmetros sem dado
 * pessoal (nada de nome, e-mail ou código de grupo).
 */
export type GaEvent = { name: string; params: Record<string, string | number> };

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? v : undefined);

export function toGaEvent(name: EventName, props?: Record<string, unknown>): GaEvent | null {
  const p = props ?? {};
  const clean = (o: Record<string, string | number | undefined>) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Record<string, string | number>;
  switch (name) {
    case 'auth_completed':
      // nome recomendado do GA4; no site também dispara a conversão do Google Ads
      return { name: 'sign_up', params: clean({ method: str(p.metodo) }) };
    case 'draw_completed_client':
      return { name: 'draw_completed', params: clean({ participantes: str(p.n) }) };
    case 'participant_claimed':
      return { name: 'participant_claimed', params: {} };
    case 'outbound_click':
      return { name: 'outbound_click', params: clean({ origem: str(p.origem) }) };
    case 'create_started':
      return { name: 'create_started', params: clean({ origem: str(p.origem) }) };
    case 'share_whatsapp_clicked':
      return { name: 'share', params: { method: 'whatsapp' } };
    case 'link_copied':
      return { name: 'share', params: clean({ method: str(p.via) === 'compartilhar' ? 'compartilhar' : 'link' }) };
    case 'wish_list_saved':
      return { name: 'wish_list_saved', params: {} };
    case 'batch_imported':
      return { name: 'batch_imported', params: clean({ grupos: str(p.grupos), pessoas: str(p.pessoas) }) };
    default:
      return null;
  }
}
