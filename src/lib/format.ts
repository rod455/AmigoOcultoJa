const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatBRL(cents: number | null | undefined, opts: { prefix?: boolean } = {}): string {
  if (cents == null) return '';
  const reais = Math.round(cents / 100);
  const value = cents % 100 === 0 ? String(reais) : (cents / 100).toFixed(2).replace('.', ',');
  return (opts.prefix === false ? '' : 'R$ ') + value;
}

/**
 * Faixa de valor de um produto ("até R$ 100"). A Amazon não permite exibir
 * preço fixo de produto fora da API oficial, então a interface mostra só a faixa;
 * o preço aproximado guardado no banco serve para filtrar pelo valor do grupo.
 */
export function priceBand(cents: number | null | undefined): string {
  if (cents == null) return '';
  for (const top of [5000, 10000, 20000, 40000]) if (cents <= top) return `Até ${formatBRL(top)}`;
  return `Acima de ${formatBRL(40000)}`;
}

/** "24 de dez" a partir de "2026-12-24" */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} de ${MONTHS[m - 1]}`;
}

/** "24/12/2026" */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Linha "Até R$ 100 · 24 de dez" */
export function groupMeta(budgetCents: number | null | undefined, exchangeAt: string | null | undefined): string {
  const parts: string[] = [];
  parts.push(budgetCents == null ? 'Sem valor definido' : `Até ${formatBRL(budgetCents)}`);
  if (exchangeAt) parts.push(formatDay(exchangeAt));
  return parts.join(' · ');
}

export function firstName(full: string): string {
  return (full ?? '').trim().split(/\s+/)[0] ?? '';
}

export function storeLabel(store: string | null | undefined): string {
  switch ((store ?? '').toLowerCase()) {
    case 'amazon':
      return 'Amazon';
    case 'mercadolivre':
      return 'Mercado Livre';
    default:
      return store ?? '';
  }
}

/** Lista "Bruno e Elisa" / "Bruno, Carla e Elisa" */
export function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
