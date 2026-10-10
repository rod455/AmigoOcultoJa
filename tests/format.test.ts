import { describe, expect, it } from 'vitest';
import { formatBRL, priceBand } from '../src/lib/format';

describe('priceBand', () => {
  it('mostra a menor faixa que cobre o preço', () => {
    expect(priceBand(2990)).toBe('Até R$ 50');
    expect(priceBand(5000)).toBe('Até R$ 50');
    expect(priceBand(5001)).toBe('Até R$ 100');
    expect(priceBand(9990)).toBe('Até R$ 100');
    expect(priceBand(19900)).toBe('Até R$ 200');
    expect(priceBand(39900)).toBe('Até R$ 400');
  });
  it('acima de R$ 400 e sem preço', () => {
    expect(priceBand(45000)).toBe('Acima de R$ 400');
    expect(priceBand(null)).toBe('');
  });
});

describe('formatBRL', () => {
  it('reais inteiros e centavos', () => {
    expect(formatBRL(10000)).toBe('R$ 100');
    expect(formatBRL(4990)).toBe('R$ 49,90');
  });
});
