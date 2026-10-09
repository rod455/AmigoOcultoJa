import { track } from './analytics';
import { getDeviceKey } from './device';
import { anonKeyValue, functionsUrl, supabase } from './supabase';

/* ---------------------------------------------------------------- */
/* Tipos                                                             */
/* ---------------------------------------------------------------- */

export type WishItem = {
  id: string;
  title: string;
  product_id: string | null;
  price_cents: number | null;
  store: string | null;
  position: number;
  is_search: boolean;
};

export type Product = {
  id: string;
  name: string;
  price_cents: number;
  store: string;
  image_url: string | null;
  tags: string[] | null;
};

export type PublicGroup = {
  id: string;
  code: string;
  name: string;
  budget_cents: number | null;
  exchange_at: string | null;
  status: string;
  organizer_name: string | null;
  participants: Array<{ id: string; display_name: string; claimed: boolean }>;
};

export type MyResult = {
  group: { id: string; code: string; name: string; budget_cents: number | null; exchange_at: string | null };
  me: { id: string; display_name: string };
  friend: { id: string; display_name: string; items: WishItem[] };
  version: number;
  my_items: WishItem[];
  /** lembretes anônimos recebidos e ainda não atendidos (minha lista vazia) */
  nudges_for_me: number;
  /** último lembrete que mandei para quem eu tirei */
  nudged_friend_at: string | null;
};

export type ParticipantStatus = 'not_opened' | 'entered' | 'viewed' | 'list_ready';

export type Panel = {
  group: {
    id: string;
    code: string;
    name: string;
    budget_cents: number | null;
    exchange_at: string | null;
    single_cycle: boolean;
    status: string;
    created_at: string;
    max_version: number;
  };
  participants: Array<{
    id: string;
    display_name: string;
    is_organizer: boolean;
    status: ParticipantStatus;
    items_count: number;
  }>;
  exclusions: Array<[string, string]>;
};

export type MyGroup = {
  code: string;
  name: string;
  budget_cents: number | null;
  exchange_at: string | null;
  created_at: string;
  total: number;
  viewed: number;
  organizer_participant_id: string | null;
};

export class ApiError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.code = code;
    this.details = details;
  }
}

/* ---------------------------------------------------------------- */
/* Helpers                                                           */
/* ---------------------------------------------------------------- */

function rpcError(err: { message?: string; code?: string } | null): ApiError {
  const msg = err?.message ?? 'Erro';
  // Postgres: "GROUP_NOT_FOUND" vem como message da exception
  const known = msg.match(/^[A-Z_]{4,}$/)?.[0];
  return new ApiError(known ?? err?.code ?? 'UNKNOWN', msg);
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw rpcError(error);
  return data as T;
}

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  // com sessão, manda o JWT do usuário: a função vincula o grupo à conta
  let token = anonKeyValue;
  try {
    const { data } = await supabase().auth.getSession();
    if (data.session?.access_token) token = data.session.access_token;
  } catch {
    // sem sessão: segue com a chave do aparelho
  }
  const res = await fetch(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKeyValue,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(String(json.code ?? `HTTP_${res.status}`), String(json.message ?? 'Erro'), json);
  }
  return json as T;
}

/* ---------------------------------------------------------------- */
/* Organizador                                                       */
/* ---------------------------------------------------------------- */

export type CreateGroupInput = {
  name: string;
  budgetCents: number | null;
  exchangeAt: string | null;
  singleCycle: boolean;
  participants: Array<{ name: string; isOrganizer?: boolean }>;
  exclusions: Array<[number, number]>;
};

export type CreateGroupResult = { code: string; group_id: string; organizer_participant_id: string | null };

export async function createAndDraw(input: CreateGroupInput): Promise<CreateGroupResult> {
  const key = await getDeviceKey();
  const started = Date.now();
  try {
    const r = await callFunction<CreateGroupResult>('draw_group', {
      key,
      name: input.name,
      budget_cents: input.budgetCents,
      exchange_at: input.exchangeAt,
      single_cycle: input.singleCycle,
      participants: input.participants.map((p) => ({ name: p.name, is_organizer: !!p.isOrganizer })),
      exclusions: input.exclusions,
    });
    track('draw_completed_client', { n: input.participants.length, tempo_ms: Date.now() - started }, { code: r.code });
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'DRAW_IMPOSSIBLE') {
      track('draw_impossible', { n: input.participants.length, qtd_exclusoes: input.exclusions.length });
    }
    throw e;
  }
}

export async function getPanel(code: string): Promise<Panel> {
  const key = await getDeviceKey();
  return rpc<Panel>('rpc_panel', { p_code: code, p_key: key });
}

export async function releaseParticipant(code: string, participantId: string): Promise<void> {
  const key = await getDeviceKey();
  await rpc('rpc_release', { p_code: code, p_key: key, p_participant_id: participantId });
}

export type RepairResult = { ok: true; changed_count: number; redrawn: boolean; version: number; participant_id?: string };

export async function removeParticipant(code: string, participantId: string): Promise<RepairResult> {
  const key = await getDeviceKey();
  return callFunction<RepairResult>('repair_group', { key, code, action: 'remove', participant_id: participantId });
}

export async function addParticipant(code: string, name: string): Promise<RepairResult> {
  const key = await getDeviceKey();
  return callFunction<RepairResult>('repair_group', { key, code, action: 'add', name });
}

export async function myGroups(): Promise<MyGroup[]> {
  const key = await getDeviceKey();
  return rpc<MyGroup[]>('rpc_my_groups', { p_key: key });
}

export type NudgeResult = { ok: true; already: boolean; last_at: string };

export async function nudge(code: string, kind: 'organizador' | 'anonimo', participantId?: string, toParticipantId?: string): Promise<NudgeResult> {
  const key = await getDeviceKey();
  return rpc<NudgeResult>('rpc_nudge', {
    p_code: code,
    p_participant_id: participantId ?? null,
    p_key: key,
    p_kind: kind,
    p_to_participant_id: toParticipantId ?? null,
  });
}

/* ---------------------------------------------------------------- */
/* Participante                                                      */
/* ---------------------------------------------------------------- */

export async function getGroup(code: string): Promise<PublicGroup> {
  return rpc<PublicGroup>('rpc_get_group', { p_code: code });
}

export async function claim(code: string, participantId: string): Promise<{ participant_id: string; display_name: string }> {
  const key = await getDeviceKey();
  return rpc('rpc_claim', { p_code: code, p_participant_id: participantId, p_key: key });
}

export async function myResult(code: string, participantId: string): Promise<MyResult> {
  const key = await getDeviceKey();
  return rpc<MyResult>('rpc_my_result', { p_code: code, p_participant_id: participantId, p_key: key });
}

export async function setWishItems(
  code: string,
  participantId: string,
  items: Array<{ title: string; product_id?: string | null }>,
): Promise<WishItem[]> {
  const key = await getDeviceKey();
  const r = await rpc<{ ok: boolean; items: WishItem[] }>('rpc_set_wish_items', {
    p_code: code,
    p_participant_id: participantId,
    p_key: key,
    p_items: items,
  });
  return r.items;
}

export async function suggestions(code: string, participantId?: string, limit = 6): Promise<Product[]> {
  return rpc<Product[]>('rpc_suggestions', { p_code: code, p_participant_id: participantId ?? null, p_limit: limit });
}

export async function resolveLink(opts: {
  wishItemId?: string;
  productId?: string;
  query?: string;
  code?: string;
  participantId?: string;
  origin?: string;
}): Promise<{ url: string; store: string }> {
  return rpc('rpc_resolve_link', {
    p_wish_item_id: opts.wishItemId ?? null,
    p_product_id: opts.productId ?? null,
    p_query: opts.query ?? null,
    p_code: opts.code ?? null,
    p_participant_id: opts.participantId ?? null,
    p_origin: opts.origin ?? null,
  });
}

/* ---------------------------------------------------------------- */
/* Mensagens de erro amigáveis                                       */
/* ---------------------------------------------------------------- */

export const GENERIC_ERROR = 'Não deu certo. Tente de novo.';

export function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'GROUP_NOT_FOUND':
        return 'Não achamos esse grupo. Confere o link?';
      case 'PARTICIPANT_NOT_FOUND':
        return 'Esse nome não está mais no grupo.';
      case 'ALREADY_CLAIMED':
        return 'Esse nome já foi escolhido em outro aparelho. Se for você, peça a quem organiza para liberar.';
      case 'NOT_YOURS':
        return 'Esse nome está vinculado a outro aparelho.';
      case 'NOT_OWNER':
        return 'Só quem organiza pode fazer isso.';
      case 'NOT_DRAWN':
        return 'O sorteio ainda não aconteceu.';
      case 'DRAW_IMPOSSIBLE':
        return e.message || 'Com essas restrições não dá para sortear.';
      case 'TOO_FEW':
        return 'Precisa de pelo menos 3 pessoas.';
      case 'TOO_MANY':
        return 'O máximo é 50 pessoas.';
      case 'DUPLICATE':
        return e.message || 'Tem nome repetido. Inclua o sobrenome.';
      case 'TOO_MANY_ITEMS':
        return 'Escolha até 3 presentes.';
      default:
        if (/fetch|network|load failed/i.test(e.message)) return 'Sem conexão. Verifique a internet e tente de novo.';
        return e.message || GENERIC_ERROR;
    }
  }
  if (e instanceof Error && /fetch|network/i.test(e.message)) return 'Sem conexão. Verifique a internet e tente de novo.';
  return GENERIC_ERROR;
}
