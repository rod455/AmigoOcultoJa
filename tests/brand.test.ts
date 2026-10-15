import { describe, expect, it } from 'vitest';
import { accentFrom, contrast, DEFAULT_ACCENT, dominantColor, normalizeHex, parseBrand } from '../src/lib/brand';

/** Telas do grupo com a cor da empresa: qualquer cor escolhida tem de continuar legível. */
describe('accentFrom', () => {
  it('sem marca, fica o visual padrão do Amigo Oculto Já!', () => {
    expect(accentFrom(null)).toEqual(DEFAULT_ACCENT);
    expect(accentFrom({ primary: 'vermelho' })).toEqual(DEFAULT_ACCENT);
  });

  it.each(['#FFD400', '#7CFC00', '#00B2FF', '#1F4BB8', '#000000', '#FFFFFF', '#E30613', '#F5F5F5'])('cor %s: texto do botão e links passam no AA', (hex) => {
    const a = accentFrom({ primary: hex });
    // botão: texto grande e negrito (17px bold) pede 3:1; exigimos o máximo entre branco e carvão
    expect(contrast(a.accent, a.onAccent)).toBeGreaterThanOrEqual(Math.min(4.5, Math.max(contrast(hex, '#FFFFFF'), contrast(hex, '#111418'))) - 0.01);
    expect(contrast(a.accent, a.onAccent)).toBeGreaterThanOrEqual(3);
    // texto na cor da marca sobre branco
    expect(contrast(a.accentText, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('amarelo leva texto escuro no botão; azul-escuro leva branco', () => {
    expect(accentFrom({ primary: '#FFD400' }).onAccent).toBe('#111418');
    expect(accentFrom({ primary: '#1F4BB8' }).onAccent).toBe('#FFFFFF');
  });

  it('a cor secundária tinge o fundo de apoio', () => {
    const a = accentFrom({ primary: '#1F4BB8', secondary: '#FFD400' });
    expect(a.tint).not.toBe(accentFrom({ primary: '#1F4BB8' }).tint);
  });
});

describe('parseBrand', () => {
  const gid = '0f8fad5b-d9cb-469f-a165-70867728950e';
  it('aceita o formato gravado pelo banco', () => {
    expect(parseBrand({ primary: '#FF6600', name: 'ACME', logo: `${gid}/logo-1.webp` })).toEqual({ primary: '#FF6600', name: 'ACME', logo: `${gid}/logo-1.webp`, secondary: undefined });
  });
  it('descarta logo com caminho estranho e cor inválida', () => {
    expect(parseBrand({ primary: '#FF6600', logo: '../../etc/passwd' })?.logo).toBeUndefined();
    expect(parseBrand({ primary: 'red' })).toBeNull();
    expect(parseBrand(null)).toBeNull();
  });
});

describe('normalizeHex', () => {
  it('aceita com e sem #, 3 ou 6 dígitos', () => {
    expect(normalizeHex('ff6600')).toBe('#FF6600');
    expect(normalizeHex('#f60')).toBe('#FF6600');
    expect(normalizeHex('#ff660')).toBeNull();
  });
});

describe('dominantColor', () => {
  const px = (r: number, g: number, b: number, a = 255, n = 50) => Array.from({ length: n }, () => [r, g, b, a]).flat();
  it('acha o laranja de um logo laranja com texto preto em fundo branco', () => {
    const c = dominantColor([...px(255, 255, 255, 255, 400), ...px(0, 0, 0, 255, 150), ...px(250, 100, 0, 255, 120)]);
    expect(c).not.toBeNull();
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c!.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(200);
    expect(b).toBeLessThan(60);
    expect(g).toBeGreaterThan(60);
  });
  it('logo só preto e branco não sugere cor', () => {
    expect(dominantColor([...px(255, 255, 255, 255, 400), ...px(10, 10, 10, 255, 300)])).toBeNull();
  });
});
