import { track } from './analytics';
import { parseAmazonInput } from '../../supabase/functions/_shared/amazon';
import { getDeviceKey } from './device';
import { anonKeyValue, functionsUrl, supabase } from './supabase';

/* ---------------------------------------------------------------- */
/* Tipos                                                             */
/* ---------------------------------------------------------------- */

/** product = catálogo · search = busca na Amazon · link = produto escolhido na Amazon · text = fora da Amazon */
export type WishKind = 'product' | 'search' | 'link' | 'text';

export type WishItem = {
  id: string;
  title: string;
  product_id: string | null;
  price_cents: number | null;
  store: string | null;
  position: number;
  kind?: WishKind;
  asin?: string | null;
  is_search: boolean;
  has_link?: boolean;
};

export function wishKind(it: Pick<WishItem, 'kind' | 'product_id'>): WishKind {
  return it.kind ?? (it.product_id ? 'product' : 'search');
}

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
  /** marca da empresa (groups.theme); ler com parseBrand */
  brand?: unknown;
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
    /** marca da empresa (groups.theme); ler com parseBrand */
    brand?: unknown;
    /** lote da empresa (importação de planilha) a que o grupo pertence */
    batch_id?: string | null;
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

/**
 * Marca da empresa no grupo (logo, cores e nome). `null` volta ao visual
 * padrão. O logo precisa já estar no bucket group-logos (uploadGroupLogo).
 */
export async function setGroupBrand(code: string, brand: { name?: string; logo?: string; primary: string; secondary?: string } | null): Promise<unknown> {
  const key = await getDeviceKey();
  return rpc<unknown>('rpc_set_group_brand', { p_code: code, p_key: key, p_brand: brand });
}

/** Envia o logo já preparado para a pasta do grupo. Só funciona com a conta de quem organiza logada. */
export async function uploadGroupLogo(groupId: string, file: Blob, ext: 'webp' | 'png'): Promise<string> {
  const path = `${groupId}/logo-${Date.now().toString(36)}.${ext}`;
  const { error } = await supabase().storage.from('group-logos').upload(path, file, { contentType: `image/${ext}`, upsert: false, cacheControl: '31536000' });
  if (error) throw new ApiError(/row-level security|unauthorized|jwt/i.test(error.message) ? 'LOGO_NOT_ALLOWED' : 'LOGO_UPLOAD_FAILED', error.message);
  return path;
}

/** Apaga um logo que não é mais usado (melhor esforço). */
export async function removeGroupLogo(path: string): Promise<void> {
  await supabase().storage.from('group-logos').remove([path]).catch(() => undefined);
}

/* ---------------------------------------------------------------- */
/* Lote da empresa (importação de planilha, migração 0011)           */
/* ---------------------------------------------------------------- */

export type BatchGroup = {
  id: string;
  code: string;
  name: string;
  budget_cents: number | null;
  exchange_at: string | null;
  brand?: unknown;
  total: number;
  opened: number;
  viewed: number;
  list_ready: number;
};
export type BatchPanel = { batch: { id: string; name: string; created_at: string }; groups: BatchGroup[] };
export type MyBatch = { id: string; name: string; created_at: string; groups: number; people: number; viewed: number };

/** Cria o lote (precisa de conta logada) e devolve o id. */
export async function createBatch(name: string): Promise<string> {
  return rpc<string>('rpc_create_batch', { p_name: name });
}

/** Liga um grupo recém-criado ao lote. */
export async function attachGroup(batchId: string, code: string): Promise<void> {
  const key = await getDeviceKey();
  await rpc<null>('rpc_attach_group', { p_batch: batchId, p_code: code, p_key: key });
}

export async function getBatchPanel(batchId: string): Promise<BatchPanel> {
  return rpc<BatchPanel>('rpc_batch_panel', { p_batch: batchId });
}

export async function myBatches(): Promise<MyBatch[]> {
  return (await rpc<MyBatch[] | null>('rpc_my_batches', {})) ?? [];
}

/** Marca da empresa em todos os grupos do lote. `null` volta ao visual padrão. */
export async function setBatchBrand(batchId: string, brand: { name?: string; logo?: string; primary: string; secondary?: string } | null): Promise<unknown> {
  return rpc<unknown>('rpc_batch_set_brand', { p_batch: batchId, p_brand: brand });
}

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
  items: Array<{ title: string; product_id?: string | null; kind?: WishKind; asin?: string | null }>,
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

/**
 * Link de produto colado por quem participa → ASIN. Links completos do
 * amazon.com.br são lidos aqui mesmo; links curtos (a.co, amzn.to) passam pela
 * Edge Function, que segue o redirecionamento.
 */
export async function resolveAmazonLink(text: string): Promise<string> {
  const parsed = parseAmazonInput(text);
  if (parsed.kind === 'asin') return parsed.asin;
  if (parsed.kind === 'not_amazon') throw new ApiError('NOT_AMAZON', 'Esse link não é da Amazon.');
  if (parsed.kind === 'no_product') throw new ApiError('NO_PRODUCT', 'Esse link não é de um produto.');
  const r = await callFunction<{ asin: string }>('resolve_amazon_link', { text });
  return r.asin;
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
      case 'LOGIN_REQUIRED':
        return 'Entre na sua conta para continuar.';
      case 'NOT_BATCH_MEMBER':
        return 'Esses grupos são de outra conta. Entre com a conta que fez a importação.';
      case 'TOO_MANY_BATCHES':
        return 'Muitas importações hoje. Tente de novo amanhã ou fale com a gente.';
      case 'LOGO_NOT_ALLOWED':
        return 'Para enviar o logo, entre com a mesma conta que criou o grupo.';
      case 'LOGO_UPLOAD_FAILED':
        return 'Não deu para enviar o logo. Tente um PNG ou JPG menor.';
      case 'INVALID_BRAND_COLOR':
        return 'Essa cor não é válida. Use o formato #1F4BB8.';
      case 'INVALID_BRAND_NAME':
        return 'O nome da empresa pode ter até 60 letras.';
      case 'INVALID_BRAND_LOGO':
      case 'INVALID_BRAND':
        return 'Não deu para salvar a marca. Envie o logo de novo.';
      case 'TOO_MANY_ITEMS':
        return 'Escolha até 3 presentes.';
      case 'NOT_AMAZON':
        return 'Esse link não é da Amazon. Para outras lojas, use "Fora da Amazon".';
      case 'NO_PRODUCT':
      case 'INVALID_LINK':
        return 'Não achamos o produto nesse link. Abra a página do produto na Amazon e copie o link de lá.';
      default:
        if (/fetch|network|load failed/i.test(e.message)) return 'Sem conexão. Verifique a internet e tente de novo.';
        return e.message || GENERIC_ERROR;
    }
  }
  if (e instanceof Error && /fetch|network/i.test(e.message)) return 'Sem conexão. Verifique a internet e tente de novo.';
  return GENERIC_ERROR;
}
