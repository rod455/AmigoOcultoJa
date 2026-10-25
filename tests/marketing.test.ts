import { describe, expect, it } from 'vitest';
import catalog from '../src/content/eventos.json';
import { toGaEvent } from '../src/lib/marketing-events';

describe('eventos de campanha (GA4 / Firebase)', () => {
  it('cadastro vira sign_up com o método', () => {
    expect(toGaEvent('auth_completed', { metodo: 'google' })).toEqual({ name: 'sign_up', params: { method: 'google' } });
  });
  it('os eventos pedidos pelo marketing saem com nome próprio', () => {
    expect(toGaEvent('draw_completed_client', { n: 8, tempo_ms: 120 })).toEqual({ name: 'draw_completed', params: { participantes: 8 } });
    expect(toGaEvent('participant_claimed')).toEqual({ name: 'participant_claimed', params: {} });
    expect(toGaEvent('outbound_click', { origem: 'lista' })).toEqual({ name: 'outbound_click', params: { origem: 'lista' } });
  });
  it('compartilhar por WhatsApp, link ou folha do sistema vira share', () => {
    expect(toGaEvent('share_whatsapp_clicked')?.params.method).toBe('whatsapp');
    expect(toGaEvent('link_copied')?.params.method).toBe('link');
    expect(toGaEvent('link_copied', { via: 'compartilhar' })?.params.method).toBe('compartilhar');
  });
  it('nenhum parâmetro leva dado pessoal ou código de grupo', () => {
    const props = { metodo: 'email', n: 5, origem: 'home', grupos: 3, pessoas: 40, email: 'a@b.com', nome: 'Ana', code: 'ABC123' };
    for (const name of Object.keys(catalog.eventos) as Array<keyof typeof catalog.eventos>) {
      const ev = toGaEvent(name, props);
      if (!ev) continue;
      expect(ev.name).toMatch(/^[a-z_]{1,40}$/);
      for (const v of Object.values(ev.params)) expect(['a@b.com', 'Ana', 'ABC123']).not.toContain(v);
    }
  });
  it('o resto fica só no nosso banco', () => {
    expect(toGaEvent('session_started')).toBeNull();
    expect(toGaEvent('delivery_address_set')).toBeNull();
  });
});
