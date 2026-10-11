import { describe, expect, it } from 'vitest';
import { asinFromUrl, firstUrl, parseAmazonInput } from '../supabase/functions/_shared/amazon';

describe('links da Amazon', () => {
  it('extrai o ASIN de links de produto do amazon.com.br', () => {
    expect(asinFromUrl('https://www.amazon.com.br/Mattel-W2085-UNO-Original/dp/B00CTH0A1Q')).toBe('B00CTH0A1Q');
    expect(asinFromUrl('https://www.amazon.com.br/dp/b00cth0a1q?ref=x&th=1')).toBe('B00CTH0A1Q');
    expect(asinFromUrl('https://amazon.com.br/gp/product/8550807567/ref=abc')).toBe('8550807567');
    expect(asinFromUrl('https://www.amazon.com.br/gp/aw/d/B079Y8XFNN')).toBe('B079Y8XFNN');
  });
  it('recusa outros sites e buscas', () => {
    expect(asinFromUrl('https://www.amazon.com/dp/B00CTH0A1Q')).toBeNull();
    expect(asinFromUrl('https://evil.com/dp/B00CTH0A1Q')).toBeNull();
    expect(asinFromUrl('https://www.amazon.com.br/s?k=uno')).toBeNull();
    expect(asinFromUrl('https://amazon.com.br.evil.com/dp/B00CTH0A1Q')).toBeNull();
  });
  it('acha o link dentro do texto compartilhado pelo app da Amazon', () => {
    expect(firstUrl('Confira este produto: https://a.co/d/7h2kLmN')).toBe('https://a.co/d/7h2kLmN');
    expect(firstUrl('amazon.com.br/dp/B00CTH0A1Q')).toBe('https://amazon.com.br/dp/B00CTH0A1Q');
    expect(firstUrl('quero um uno')).toBeNull();
  });
  it('classifica o que foi colado', () => {
    expect(parseAmazonInput('https://www.amazon.com.br/dp/B00CTH0A1Q')).toMatchObject({ kind: 'asin', asin: 'B00CTH0A1Q' });
    expect(parseAmazonInput('https://a.co/d/7h2kLmN')).toMatchObject({ kind: 'short' });
    expect(parseAmazonInput('https://amzn.to/3xYz')).toMatchObject({ kind: 'short' });
    expect(parseAmazonInput('https://www.amazon.com.br/s?k=uno')).toMatchObject({ kind: 'no_product' });
    expect(parseAmazonInput('https://www.magazineluiza.com.br/produto')).toEqual({ kind: 'not_amazon' });
    expect(parseAmazonInput('um livro')).toEqual({ kind: 'not_amazon' });
  });
});
