import { describe, expect, it } from 'vitest';
import { normalizeTag, parseAttribution, parseInstallReferrer, referrerHost } from '../src/lib/utm';

describe('chegada (utm e referrer)', () => {
  it('normaliza para um vocabulário fechado', () => {
    expect(normalizeTag(' Instagram ')).toBe('instagram');
    expect(normalizeTag('Natal Família 2026')).toBe('natal-familia-2026');
    expect(normalizeTag('')).toBeUndefined();
  });

  it('lê a campanha e o clique pago', () => {
    expect(parseAttribution('?utm_source=Instagram&utm_medium=Stories&utm_campaign=Natal', '', '/')).toEqual({
      source: 'instagram',
      medium: 'stories',
      campaign: 'natal',
      landing: '/',
    });
    expect(parseAttribution('?gclid=abc123', 'https://www.google.com/', '/')).toMatchObject({ source: 'google', medium: 'cpc', gclid: 'abc123', ref: 'google.com' });
  });

  it('guarda o site que mandou a visita, menos o nosso', () => {
    expect(referrerHost('https://chatgpt.com/c/123')).toBe('chatgpt.com');
    expect(referrerHost('https://www.amigoocultoja.com.br/termos')).toBeUndefined();
    expect(referrerHost('nao é url')).toBeUndefined();
    expect(parseAttribution('', 'https://www.perplexity.ai/search', '/')).toEqual({ ref: 'perplexity.ai', landing: '/' });
  });

  it('sem sinal nenhum não grava nada (chegada direta não apaga campanha)', () => {
    expect(parseAttribution('', '', '/')).toBeNull();
    expect(parseAttribution('?code=XYZ', 'https://amigoocultoja.com.br/', '/g/ABC')).toBeNull();
  });

  it('lê o referrer de instalação da Play', () => {
    expect(parseInstallReferrer('utm_source=google-play&utm_medium=organic')).toEqual({ source: 'google-play', medium: 'organic', landing: 'instalacao-play' });
    expect(parseInstallReferrer('utm_source%3Dsite%26utm_campaign%3Dnatal')).toMatchObject({ source: 'site', campaign: 'natal' });
    expect(parseInstallReferrer('')).toBeNull();
  });
});
