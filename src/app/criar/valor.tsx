import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { ChevronRight, Close } from '@/components/icons';
import { Sheet } from '@/components/Sheet';
import { Calendar } from '@/components/Calendar';
import { Button, ErrorText, IconButton, Row, Screen, T, Title, TopBar } from '@/components/ui';
import { useDraft } from '@/features/create/useDraft';
import { track } from '@/lib/analytics';
import { ApiError, createAndDraw, friendlyError } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { clearDraft, setClaim } from '@/lib/device';
import { formatDay } from '@/lib/format';
import { colors, fonts } from '@/theme/tokens';

const BUDGETS: Array<{ label: string; cents: number | null }> = [
  { label: 'R$ 50', cents: 5000 },
  { label: 'R$ 100', cents: 10000 },
  { label: 'Sem valor', cents: null },
];
const PRESETS = new Set<number | null>(BUDGETS.map((b) => b.cents));
const MIN_REAIS = 5;
const MAX_REAIS = 10000;

/** "150" → 15000 centavos; vazio ou fora da faixa → null */
function parseReais(text: string): number | null {
  const n = Number(text.replace(/\D/g, ''));
  if (!Number.isFinite(n) || n < MIN_REAIS || n > MAX_REAIS) return null;
  return n * 100;
}

function quickDates(): Array<{ label: string; iso: string }> {
  const y = new Date().getFullYear();
  const dec = (d: number) => `${y}-12-${String(d).padStart(2, '0')}`;
  return [
    { label: '24 de dez', iso: dec(24) },
    { label: '25 de dez', iso: dec(25) },
    { label: '31 de dez', iso: dec(31) },
  ];
}

/** Tela 4 — Valor e sortear (SPresente) */
export default function Valor() {
  const { draft, update, ready } = useDraft();
  const params = useLocalSearchParams<{ auto?: string }>();
  const autoRan = useRef(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [exSheet, setExSheet] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // "Outro": valor digitado por quem organiza
  const [custom, setCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const customRef = useRef<TextInput>(null);

  // rascunho salvo com valor fora dos atalhos (ex.: R$ 150) abre já em "Outro"
  useEffect(() => {
    if (ready && !PRESETS.has(draft.budgetCents) && draft.budgetCents != null) {
      setCustom(true);
      setCustomText(String(Math.round(draft.budgetCents / 100)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const customValid = !custom || parseReais(customText) != null;

  useEffect(() => {
    if (ready && (!draft.name || !draft.organizerName)) router.replace('/criar/nome');
  }, [ready, draft.name, draft.organizerName]);

  // voltou do login com ?auto=1 → sorteia sozinho, uma vez
  useEffect(() => {
    if (!ready || params.auto !== '1' || autoRan.current || !draft.name || !draft.organizerName) return;
    autoRan.current = true;
    router.setParams({ auto: '' });
    void sortear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, params.auto]);

  // índice 0 = organizador, depois os demais (mesma ordem enviada ao servidor)
  const names = useMemo(() => [draft.organizerName, ...draft.participants], [draft.organizerName, draft.participants]);

  const pairLabel = (p: [number, number]) => `${names[p[0]]} e ${names[p[1]]}`;

  const hasPair = (a: number, b: number) => draft.exclusions.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  const addPair = (a: number, b: number) => {
    if (a === b || hasPair(a, b)) return;
    update((d) => ({ exclusions: [...d.exclusions, [a, b]] }));
  };

  const removePair = (i: number) => update((d) => ({ exclusions: d.exclusions.filter((_, k) => k !== i) }));

  const sortear = async () => {
    if (!customValid) {
      setError(`Digite o valor do presente, de R$ ${MIN_REAIS} a R$ ${MAX_REAIS.toLocaleString('pt-BR')}.`);
      customRef.current?.focus();
      return;
    }
    setLoading(true);
    setError('');
    // Login acontece aqui, só na hora de criar (spec §6.1). O rascunho já está salvo.
    const session = await getSession();
    if (!session) {
      setLoading(false);
      track('auth_required', { origem: 'sortear' });
      router.push({ pathname: '/conta', params: { next: '/criar/valor?auto=1' } });
      return;
    }
    track('budget_set', { valor: draft.budgetCents, tem_data: !!draft.exchangeAt, qtd_exclusoes: draft.exclusions.length });
    try {
      const r = await createAndDraw({
        name: draft.name,
        budgetCents: draft.budgetCents,
        exchangeAt: draft.exchangeAt,
        singleCycle: draft.singleCycle,
        participants: names.map((n, i) => ({ name: n, isOrganizer: i === 0 })),
        exclusions: draft.exclusions,
      });
      if (r.organizer_participant_id) await setClaim(r.code, r.organizer_participant_id);
      await clearDraft();
      router.replace({ pathname: '/pronto/[codigo]', params: { codigo: r.code } });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DRAW_IMPOSSIBLE') {
        const det = e.details as { participants?: string[]; blocking?: string[][] } | undefined;
        const who = det?.blocking?.map((p) => p.join(' e ')).join(', ');
        setError(who ? `Com essas restrições não dá para sortear: ${who}. Libere alguma delas.` : friendlyError(e));
      } else {
        setError(friendlyError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      top={<TopBar step={3} total={3} backTo="/criar/pessoas" />}
      footer={
        <View style={{ gap: 12 }}>
          <ErrorText>{error}</ErrorText>
          <Button label="Sortear" variant="accent" onPress={sortear} loading={loading} />
          <T size={14} color={colors.textSecondary} align="center">
            Nem você vai ver quem tirou quem.
          </T>
        </View>
      }
    >
      <View style={{ gap: 28, paddingTop: 40 }}>
        <Title>Até quanto no presente?</Title>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {BUDGETS.map((b) => {
            const on = !custom && draft.budgetCents === b.cents;
            return (
              <BudgetTile
                key={b.label}
                label={b.label}
                on={on}
                onPress={() => {
                  setCustom(false);
                  setError('');
                  update({ budgetCents: b.cents });
                }}
              />
            );
          })}
          <BudgetTile
            label={custom && parseReais(customText) != null ? `R$ ${Number(customText.replace(/\D/g, '')).toLocaleString('pt-BR')}` : 'Outro'}
            on={custom}
            onPress={() => {
              setCustom(true);
              setError('');
              const cents = parseReais(customText);
              if (cents != null) update({ budgetCents: cents });
              setTimeout(() => customRef.current?.focus(), 50);
            }}
          />
        </View>

        {custom ? (
          <View style={{ gap: 6, marginTop: -12 }}>
            <T size={14} weight="semibold" color={colors.textSecondary} nativeID="lbl-valor">
              Valor do presente
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, borderBottomColor: customValid || !customText ? colors.text : colors.accent }}>
              <T size={24} weight="semibold">
                R$
              </T>
              <TextInput
                ref={customRef}
                value={customText}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, '').slice(0, 5);
                  setCustomText(digits);
                  setError('');
                  const cents = parseReais(digits);
                  if (cents != null) update({ budgetCents: cents });
                }}
                placeholder="150"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={5}
                returnKeyType="done"
                accessibilityLabelledBy="lbl-valor"
                style={[{ flex: 1, height: 56, fontSize: 24, fontFamily: fonts.semibold, color: colors.text, paddingVertical: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
              />
            </View>
            <T size={13} color={customText && !customValid ? colors.accentDark : colors.textSecondary}>
              {customText && !customValid ? `Use um valor de R$ ${MIN_REAIS} a R$ ${MAX_REAIS.toLocaleString('pt-BR')}.` : 'Só números, em reais.'}
            </T>
          </View>
        ) : null}

        <View>
          <Pressable accessibilityRole="button" onPress={() => setDateSheet(true)}>
            <Row height={60} style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
              <T size={17} style={{ flexGrow: 1 }}>
                Dia da troca
              </T>
              <T size={17} weight="semibold" color={draft.exchangeAt ? colors.text : colors.textMuted}>
                {draft.exchangeAt ? formatDay(draft.exchangeAt) : 'Opcional'}
              </T>
              <ChevronRight />
            </Row>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setExSheet(true)}>
            <Row height={60}>
              <T size={17} style={{ flexGrow: 1 }}>
                Quem não pode se tirar
              </T>
              <T size={17} weight="semibold" color={draft.exclusions.length ? colors.text : colors.textMuted}>
                {draft.exclusions.length === 0 ? 'Ninguém' : draft.exclusions.length === 1 ? '1 par' : `${draft.exclusions.length} pares`}
              </T>
              <ChevronRight />
            </Row>
          </Pressable>
        </View>
      </View>

      {/* Folha: data (calendário) */}
      <Sheet
        visible={dateSheet}
        onClose={() => setDateSheet(false)}
        title="Dia da troca"
        footer={
          <View style={{ gap: 6 }}>
            <Button label={draft.exchangeAt ? `Pronto · ${formatDay(draft.exchangeAt)}` : 'Pronto'} onPress={() => setDateSheet(false)} />
            <Button label="Sem data" variant="ghost" onPress={() => { update({ exchangeAt: null }); setDateSheet(false); }} />
          </View>
        }
      >
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {quickDates().map((q) => {
              const on = draft.exchangeAt === q.iso;
              return (
                <Pressable
                  key={q.iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => update({ exchangeAt: q.iso })}
                  style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.text : colors.surfaceAlt }}
                >
                  <T size={15} weight="semibold" color={on ? '#FFFFFF' : colors.text}>
                    {q.label}
                  </T>
                </Pressable>
              );
            })}
          </View>
          <Calendar key={dateSheet ? 'open' : 'closed'} value={draft.exchangeAt} onChange={(iso) => update({ exchangeAt: iso })} />
        </View>
      </Sheet>

      {/* Folha: pares proibidos */}
      <Sheet
        visible={exSheet}
        onClose={() => { setExSheet(false); setPicking(null); }}
        title="Quem não pode se tirar"
        footer={<Button label="Pronto" onPress={() => { setExSheet(false); setPicking(null); }} />}
      >
        <View style={{ gap: 16 }}>
          {draft.exclusions.length > 0 ? (
            <View>
              <T size={14} weight="bold" color={colors.textSecondary} style={{ paddingBottom: 4 }}>
                PARES
              </T>
              {draft.exclusions.map((p, i) => (
                <Row key={`${p[0]}-${p[1]}`}>
                  <T size={16} style={{ flexGrow: 1 }}>
                    {pairLabel(p)}
                  </T>
                  <IconButton label={`Remover par ${pairLabel(p)}`} onPress={() => removePair(i)}>
                    <Close />
                  </IconButton>
                </Row>
              ))}
            </View>
          ) : null}
          <View>
            <T size={14} weight="bold" color={colors.textSecondary} style={{ paddingBottom: 4 }}>
              {picking == null ? 'TOQUE NA PRIMEIRA PESSOA' : `AGORA QUEM NÃO PODE TIRAR ${names[picking].toUpperCase()}`}
            </T>
            {names.map((n, i) => {
              const selected = picking === i;
              const disabled = picking != null && (picking === i || hasPair(picking, i));
              return (
                <Pressable
                  key={`${n}-${i}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled && !selected}
                  onPress={() => {
                    if (picking == null) setPicking(i);
                    else if (picking === i) setPicking(null);
                    else {
                      addPair(picking, i);
                      setPicking(null);
                    }
                  }}
                >
                  <Row height={50}>
                    <T size={16} weight={selected ? 'bold' : 'regular'} color={disabled && !selected ? colors.textMuted : colors.text} style={{ flexGrow: 1, fontFamily: selected ? fonts.bold : fonts.regular }}>
                      {n}
                      {i === 0 ? '  ·  você' : ''}
                    </T>
                    {selected ? (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text }} />
                    ) : null}
                  </Row>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

function BudgetTile({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: '47%',
        flexGrow: 1,
        height: 72,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: on ? colors.text : colors.surface,
        borderWidth: on ? 0 : 1.5,
        borderColor: colors.line,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <T size={20} weight="bold" color={on ? '#FFFFFF' : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}
