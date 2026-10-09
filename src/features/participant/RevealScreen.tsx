import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Bell, Check, Close, Eye, EyeOff, Gift, Plus } from '@/components/icons';
import { Button, Divider, ErrorText, IconButton, Loading, Overline, Pill, Screen, Sub, T, Title, UnderlineInput } from '@/components/ui';
import { track } from '@/lib/analytics';
import { friendlyError, myResult, nudge, type MyResult, type Product, resolveLink, setWishItems, suggestions, type WishItem } from '@/lib/api';
import { getSeenVersion, setSeenVersion } from '@/lib/device';
import { firstName, formatBRL, groupMeta, storeLabel } from '@/lib/format';
import { colors, tints } from '@/theme/tokens';
import { openExternal } from '@/lib/open';

type Pick = { key: string; title: string; product_id: string | null; price_cents: number | null; store: string | null };

const MAX_ITEMS = 3;

/** Telas 8 e 9 — Você tirou + escolha seu presente (SRevelar / SLista) */
export function RevealScreen({ code, participantId, onSwitch }: { code: string; participantId: string; onSwitch: () => void }) {
  const [data, setData] = useState<MyResult | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [updatedNotice, setUpdatedNotice] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgedAt, setNudgedAt] = useState<string | null>(null);
  const claimedAt = useRef(Date.now());

  const load = useCallback(async () => {
    try {
      const r = await myResult(code, participantId);
      setData(r);
      setNudgedAt(r.nudged_friend_at);
      setError('');
      const seen = await getSeenVersion(code, participantId);
      if (seen && r.version > seen) setUpdatedNotice(true);
      await setSeenVersion(code, participantId, r.version);
      return r;
    } catch (e) {
      setError(friendlyError(e));
      return null;
    }
  }, [code, participantId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await load();
      if (!alive || !r) return;
      track('result_viewed', { segundos_desde_claim: Math.round((Date.now() - claimedAt.current) / 1000) }, { code, participantId });
      setEditing(r.my_items.length === 0);
      setPicks(r.my_items.map(itemToPick));
      suggestions(code, participantId, 6)
        .then((p) => alive && setProducts(p))
        .catch(() => undefined);
    })();
    // atualiza a lista do amigo periodicamente ("em tempo real" sem websocket)
    const id = setInterval(() => void load(), 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [load, code, participantId]);

  const friend = data?.friend;
  const friendFirst = friend ? firstName(friend.display_name) : '';
  const meFirst = data ? firstName(data.me.display_name) : '';
  const budget = data?.group.budget_cents ?? null;

  const ideas = useMemo(() => products.slice(0, 3), [products]);

  const togglePick = (p: Product) => {
    setPicks((cur) => {
      const on = cur.some((c) => c.product_id === p.id);
      if (on) return cur.filter((c) => c.product_id !== p.id);
      if (cur.length >= MAX_ITEMS) return cur;
      track('wish_item_added', { origem: 'sugestao', produto_id: p.id, loja: p.store }, { code, participantId });
      return [...cur, { key: p.id, title: p.name, product_id: p.id, price_cents: p.price_cents, store: p.store }];
    });
  };

  const addDraft = () => {
    const t = draft.trim();
    if (!t || picks.length >= MAX_ITEMS) return;
    if (picks.some((p) => p.title.toLowerCase() === t.toLowerCase())) return;
    track('wish_item_added', { origem: 'texto' }, { code, participantId });
    setPicks((cur) => [...cur, { key: `txt:${t}`, title: t, product_id: null, price_cents: null, store: null }]);
    setDraft('');
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setError('');
    try {
      const items = await setWishItems(code, participantId, picks.map((p) => ({ title: p.title, product_id: p.product_id })));
      track('wish_list_saved', { qtd_itens: items.length }, { code, participantId });
      setData({ ...data, my_items: items });
      setPicks(items.map(itemToPick));
      setEditing(false);
      setSavedFlash(true);
      setInstallPrompt(true);
      track('app_install_prompt_shown', undefined, { code, participantId });
      setTimeout(() => setSavedFlash(false), 3000);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const buy = async (opts: { wishItemId?: string; productId?: string; query?: string; origin: string }) => {
    track('outbound_click', { origem: opts.origin }, { code, participantId });
    try {
      const r = await resolveLink({ ...opts, code, participantId });
      await openExternal(r.url);
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  // Lembrete anônimo: fica só no servidor e aparece para o amigo quando ele
  // abrir o próprio link. Nada sai do aparelho de quem pediu (nem WhatsApp),
  // então ninguém descobre quem tirou quem.
  const remindFriend = async () => {
    if (!data || !friend) return;
    setNudging(true);
    setError('');
    try {
      const r = await nudge(code, 'anonimo', participantId, friend.id);
      setNudgedAt(r.last_at);
      if (!r.already) track('nudge_sent', { tipo: 'anonimo' }, { code, participantId });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setNudging(false);
    }
  };
  const nudgedRecently = !!nudgedAt && Date.now() - new Date(nudgedAt).getTime() < 12 * 3600 * 1000;

  if (!data) {
    return (
      <Screen>
        {error ? (
          <View style={{ paddingTop: 40, gap: 12 }}>
            <Title>Ops.</Title>
            <Sub>{error}</Sub>
            <Button label="Escolher outro nome" variant="outline" onPress={onSwitch} />
          </View>
        ) : (
          <Loading />
        )}
      </Screen>
    );
  }

  const friendHasList = (friend?.items.length ?? 0) > 0;
  const n = picks.length;

  const footer = editing ? (
    <View style={{ gap: 8 }}>
      <ErrorText>{error}</ErrorText>
      <Button label={n > 0 ? `Pronto, salvar (${n} de ${MAX_ITEMS})` : `Escolha até ${MAX_ITEMS} presentes`} onPress={save} disabled={n === 0} loading={saving} />
    </View>
  ) : !friendHasList ? (
    <View style={{ gap: 8 }}>
      <ErrorText>{error}</ErrorText>
      {nudgedRecently ? (
        <View style={{ gap: 4, alignItems: 'center', paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Check size={16} color={colors.successText} />
            <T size={16} weight="bold" color={colors.successText}>
              Lembrete enviado para {friendFirst}
            </T>
          </View>
          <T size={13} color={colors.textSecondary} align="center" lineHeight={18}>
            {friendFirst} vê o aviso ao abrir o Amigo Oculto Já, sem saber que foi você. Dá para lembrar de novo em 12 horas.
          </T>
        </View>
      ) : (
        <>
          <Button label={`Lembrar ${friendFirst}, sem revelar você`} icon={<Bell size={20} color="#FFFFFF" />} onPress={remindFriend} loading={nudging} />
          <T size={12} color={colors.textSecondary} align="center">
            O aviso aparece para {friendFirst} dentro do Amigo Oculto Já. Nada é enviado pelo seu WhatsApp.
          </T>
        </>
      )}
    </View>
  ) : error ? (
    <ErrorText>{error}</ErrorText>
  ) : undefined;

  return (
    <Screen padTop={24} footer={footer} gap={28}>
      {/* contexto */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <T size={15} color={colors.textSecondary} style={{ flexShrink: 1 }}>
          {data.group.name} · {groupMeta(budget, data.group.exchange_at).replace('Até', 'até')}
        </T>
        <Pressable accessibilityRole="button" onPress={onSwitch} hitSlop={8}>
          <T size={13} weight="semibold" color={colors.textMuted}>
            Não sou {meFirst}
          </T>
        </Pressable>
      </View>

      {/* aviso: alguém que me tirou pediu minha lista */}
      {data.nudges_for_me > 0 && data.my_items.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.successBg }}>
          <Bell color={colors.successText} />
          <View style={{ flex: 1, gap: 2 }}>
            <T size={16} weight="bold" color={colors.successText}>
              Alguém está esperando sua lista
            </T>
            <T size={14} color={colors.successText} lineHeight={20}>
              Quem te tirou pediu para você escolher o presente. Leva 1 minuto, logo abaixo.
            </T>
          </View>
        </View>
      ) : null}

      {/* 1. você tirou */}
      <View style={{ gap: 6 }}>
        {updatedNotice ? (
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', marginBottom: 4 }}>
            <T size={12} weight="bold" color="#FFFFFF">
              Atualizado · seu amigo oculto mudou
            </T>
          </View>
        ) : null}
        <T size={17} color={colors.textSecondary}>
          {meFirst}, você tirou
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <T size={44} weight="extrabold" lineHeight={46} style={{ letterSpacing: -1.2, flexShrink: 1 }} accessibilityLiveRegion="polite">
            {hidden ? '• • • • •' : friend?.display_name}
          </T>
          <IconButton
            label={hidden ? 'Mostrar nome' : 'Esconder nome'}
            border
            onPress={() => {
              setHidden((h) => !h);
              track('name_hidden_toggled', undefined, { code, participantId });
            }}
          >
            {hidden ? <Eye /> : <EyeOff />}
          </IconButton>
        </View>
      </View>

      {/* 2. o amigo quer */}
      <View style={{ gap: 4 }}>
        {friendHasList ? (
          <>
            <Overline>{`${friendFirst} quer`}</Overline>
            {friend!.items.map((it) => (
              <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                <View style={{ flexGrow: 1, flexShrink: 1, gap: 2 }}>
                  <T size={17} weight="semibold">
                    {it.title}
                  </T>
                  <T size={14} color={colors.textSecondary}>
                    {it.is_search ? `Opções${budget ? ` até ${formatBRL(budget)}` : ''} · ${storeLabel(it.store)}` : `${formatBRL(it.price_cents)} · ${storeLabel(it.store)}`}
                  </T>
                </View>
                <Pill label={it.is_search ? 'Ver' : 'Comprar'} onPress={() => buy({ wishItemId: it.id, origin: 'lista_amigo' })} />
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16, backgroundColor: colors.surfaceAlt, borderRadius: 16 }}>
              <Bell />
              <T size={15} lineHeight={21} style={{ flexShrink: 1 }}>
                {friendFirst} ainda não escolheu. Volte aqui depois, ou mande um lembrete sem revelar que foi você.
              </T>
            </View>
            {ideas.length > 0 ? (
              <>
                <Overline style={{ paddingTop: 16 }}>{budget ? `Enquanto isso, ideias até ${formatBRL(budget)}` : 'Enquanto isso, algumas ideias'}</Overline>
                {ideas.map((p, i) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <View style={{ flexGrow: 1, flexShrink: 1, gap: 2 }}>
                      <T size={17} weight="semibold">
                        {p.name}
                      </T>
                      <T size={13} color={colors.textSecondary}>
                        {i === 0 ? 'Uma das mais escolhidas' : `${formatBRL(p.price_cents)}`}
                      </T>
                    </View>
                    <Pill label={`Ver na ${storeLabel(p.store)}`} variant="outline" small onPress={() => buy({ productId: p.id, origin: 'ideias' })} />
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
        <T size={12} color={colors.textSecondary} lineHeight={17} style={{ paddingTop: 8 }}>
          As lojas pagam comissão ao Amigo Oculto Já pelos links. O preço para você é o mesmo.
        </T>
      </View>

      <Divider />

      {/* 3. escolha seu presente */}
      {editing ? (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Title size={26}>Escolha seu presente</Title>
            <T size={15} color={colors.textSecondary}>
              Toque em até {MAX_ITEMS}. Quem te tirou vê na hora, pronto para comprar.
            </T>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 24, paddingVertical: 2 }}>
            {products.map((p, i) => {
              const on = picks.some((c) => c.product_id === p.id);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.name}, ${formatBRL(p.price_cents)}, ${storeLabel(p.store)}`}
                  onPress={() => togglePick(p)}
                  style={{ width: 136, gap: 8, padding: 8, paddingBottom: 12, borderRadius: 18, borderWidth: 2, borderColor: on ? colors.text : colors.line, backgroundColor: colors.surface }}
                >
                  <View style={{ position: 'relative', height: 88, borderRadius: 12, backgroundColor: tints[i % tints.length], alignItems: 'center', justifyContent: 'center' }}>
                    <Gift />
                    {on ? (
                      <View style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={13} />
                      </View>
                    ) : null}
                  </View>
                  <T size={14} weight="semibold" lineHeight={17} style={{ minHeight: 35 }} numberOfLines={2}>
                    {p.name}
                  </T>
                  <View style={{ gap: 1 }}>
                    <T size={16} weight="extrabold">
                      {formatBRL(p.price_cents)}
                    </T>
                    <T size={12} color={colors.textSecondary}>
                      {storeLabel(p.store)}
                    </T>
                  </View>
                </Pressable>
              );
            })}
            {products.length === 0 ? (
              <T size={14} color={colors.textSecondary}>
                Carregando sugestões…
              </T>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderBottomColor: colors.text }}>
            <UnderlineInput
              style={{ flexGrow: 1, borderBottomWidth: 0, minWidth: 0, fontSize: 17 }}
              value={draft}
              onChangeText={setDraft}
              placeholder="Ou digite outro presente"
              returnKeyType="done"
              onSubmitEditing={addDraft}
              editable={picks.length < MAX_ITEMS}
              accessibilityLabel="Outro presente"
            />
            <IconButton label="Adicionar presente" onPress={addDraft} size={40} bg={picks.length < MAX_ITEMS && draft.trim() ? colors.text : colors.disabled}>
              <Plus />
            </IconButton>
          </View>

          {picks.length > 0 ? (
            <View>
              <Overline style={{ paddingBottom: 4 }}>Sua lista</Overline>
              {picks.map((p) => (
                <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color={colors.successText} />
                  </View>
                  <View style={{ flexGrow: 1, flexShrink: 1, gap: 1 }}>
                    <T size={16} weight="semibold">
                      {p.title}
                    </T>
                    <T size={13} color={colors.textSecondary}>
                      {p.product_id ? `${formatBRL(p.price_cents)} · ${storeLabel(p.store)}` : `Vira um link de busca${budget ? ` até ${formatBRL(budget)}` : ''}`}
                    </T>
                  </View>
                  <IconButton label={`Remover ${p.title}`} onPress={() => setPicks((cur) => cur.filter((c) => c.key !== p.key))}>
                    <Close />
                  </IconButton>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T size={22} weight="extrabold">
              Seu presente
            </T>
            <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={{ height: 44, justifyContent: 'center' }}>
              <T size={15} weight="semibold">
                Editar
              </T>
            </Pressable>
          </View>
          {data.my_items.map((it) => (
            <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' }}>
                <Check size={14} color={colors.successText} />
              </View>
              <View style={{ gap: 1, flexShrink: 1 }}>
                <T size={16} weight="semibold">
                  {it.title}
                </T>
                <T size={13} color={colors.textSecondary}>
                  {it.is_search ? `Link de busca · ${storeLabel(it.store)}` : `${formatBRL(it.price_cents)} · ${storeLabel(it.store)}`}
                </T>
              </View>
            </View>
          ))}
          <T size={14} color={savedFlash ? colors.successText : colors.textSecondary} style={{ paddingTop: 10 }}>
            Salvo. Quem te tirou já está vendo.
          </T>
          {installPrompt ? (
            <View style={{ marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: colors.surfaceAlt, gap: 8 }}>
              <T size={16} weight="bold">
                Quer ser avisado quando {friendFirst} escolher?
              </T>
              <T size={14} color={colors.textSecondary} lineHeight={20}>
                O app do Amigo Oculto Já para iPhone e Android chega em novembro. Até lá, volte por este link: ele é seu.
              </T>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function itemToPick(it: WishItem): Pick {
  return { key: it.id, title: it.title, product_id: it.product_id, price_cents: it.price_cents, store: it.store };
}
