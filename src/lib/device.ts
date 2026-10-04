import { getItem, getJSON, setItem, setJSON } from './storage';

/**
 * Identidade do aparelho (MVP web): uma chave secreta aleatória de 64 hex,
 * gerada uma vez e guardada localmente. O servidor só conhece o hash.
 * Quando o app tiver login (Apple/Google/WhatsApp), essa chave é vinculada
 * à conta sem perder os grupos e nomes já assumidos.
 */
const KEY = 'tirei.device_key';
const CLAIMS = 'tirei.claims'; // { [code]: participantId }
const SEEN_VERSION = 'tirei.seen_version'; // { [code:participantId]: version }
const DRAFT = 'tirei.draft';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let cached: string | null = null;

export async function getDeviceKey(): Promise<string> {
  if (cached) return cached;
  let k = await getItem(KEY);
  if (!k || k.length < 32) {
    k = randomHex(32);
    await setItem(KEY, k);
  }
  cached = k;
  return k;
}

export async function getClaim(code: string): Promise<string | null> {
  const all = await getJSON<Record<string, string>>(CLAIMS, {});
  return all[code.toUpperCase()] ?? null;
}

export async function setClaim(code: string, participantId: string | null): Promise<void> {
  const all = await getJSON<Record<string, string>>(CLAIMS, {});
  if (participantId) all[code.toUpperCase()] = participantId;
  else delete all[code.toUpperCase()];
  await setJSON(CLAIMS, all);
}

export async function getSeenVersion(code: string, participantId: string): Promise<number> {
  const all = await getJSON<Record<string, number>>(SEEN_VERSION, {});
  return all[`${code.toUpperCase()}:${participantId}`] ?? 0;
}

export async function setSeenVersion(code: string, participantId: string, version: number): Promise<void> {
  const all = await getJSON<Record<string, number>>(SEEN_VERSION, {});
  all[`${code.toUpperCase()}:${participantId}`] = version;
  await setJSON(SEEN_VERSION, all);
}

export type Draft = {
  name: string;
  organizerName: string;
  participants: string[];
  budgetCents: number | null;
  exchangeAt: string | null; // YYYY-MM-DD
  exclusions: Array<[number, number]>;
  singleCycle: boolean;
};

export const emptyDraft: Draft = {
  name: '',
  organizerName: '',
  participants: [],
  budgetCents: 10000,
  exchangeAt: null,
  exclusions: [],
  singleCycle: true,
};

export async function loadDraft(): Promise<Draft> {
  const d = await getJSON<Partial<Draft>>(DRAFT, {});
  return { ...emptyDraft, ...d };
}

export async function saveDraft(d: Draft): Promise<void> {
  await setJSON(DRAFT, d);
}

export async function clearDraft(): Promise<void> {
  await setJSON(DRAFT, emptyDraft);
}
