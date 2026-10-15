import { router } from 'expo-router';
import Head from 'expo-router/head';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Calendar } from '@/components/Calendar';
import { Check } from '@/components/icons';
import { Sheet } from '@/components/Sheet';
import { Button, ErrorText, T, UnderlineInput } from '@/components/ui';
import { Footer, MAX_W, Nav } from '@/features/landing/LandingPage';
import { track } from '@/lib/analytics';
import { attachGroup, createAndDraw, createBatch, friendlyError } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { formatBRL } from '@/lib/format';
import { groupName, type Person, pickSheet, planGroups, readPeople, type SplitMode, parseDelimited } from '@/lib/planilha';
import { useViewportWidth } from '@/lib/useViewportWidth';
import { biz, colors, fonts } from '@/theme/tokens';

const DRAFT_KEY = 'aoj.import_draft';
const TEMPLATE_XLSX = '/modelos/amigo-secreto-empresa.xlsx';
const TEMPLATE_CSV = '/modelos/amigo-secreto-empresa.csv';
const BUDGETS: Array<[string, number | null]> = [
  ['R$ 50', 5000],
  ['R$ 80', 8000],
  ['R$ 100', 10000],
  ['Sem valor', null],
];

type Source = 'xlsx' | 'csv' | 'colado';
type Draft = {
  people: Person[];
  source: Source;
  fileName: string;
  mode: SplitMode;
  dedupe: boolean;
  prefix: string;
  budgetCents: number | null;
  exchangeAt: string | null;
  /** grupos já criados numa tentativa anterior (para continuar de onde parou) */
  batchId?: string;
  done?: string[];
};

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function saveDraft(d: Draft | null) {
  try {
    if (d) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // sem armazenamento: segue sem rascunho
  }
}

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

async function readFile(file: File): Promise<{ people: Person[]; skipped: number; source: Source }> {
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
    const { people, skipped } = readPeople(parseDelimited(await file.text()));
    return { people, skipped, source: 'csv' };
  }
  if (!/\.xlsx$/i.test(file.name)) throw new Error('FORMATO');
  const { default: readXlsxFile } = await import('read-excel-file/universal');
  const sheets = (await readXlsxFile(await file.arrayBuffer())) as unknown as Array<{ sheet: string; data: unknown[][] }>;
  const sheet = pickSheet(sheets);
  if (!sheet) return { people: [], skipped: 0, source: 'xlsx' };
  const { people, skipped } = readPeople(sheet.data);
  return { people, skipped, source: 'xlsx' };
}

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, paddingVertical: 24, borderTopWidth: 1, borderTopColor: colors.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: done ? biz.accent : colors.text, alignItems: 'center', justifyContent: 'center' }}>
        {done ? (
          <Check size={16} />
        ) : (
          <T size={16} weight="extrabold" color="#FFFFFF">
            {n}
          </T>
        )}
      </View>
      <View style={{ flex: 1, gap: 14 }}>
        <T size={21} weight="extrabold" style={{ letterSpacing: -0.3 }} accessibilityRole="header" aria-level={2}>
          {title}
        </T>
        {children}
      </View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? biz.accent : 'transparent', borderWidth: 1.5, borderColor: on ? biz.accent : colors.lineStrong }}
    >
      <T size={14} weight="bold" color={on ? '#FFFFFF' : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

function names(people: string[], max = 4): string {
  const shown = people.slice(0, max).join(', ');
  return people.length > max ? `${shown} e mais ${people.length - max}` : shown;
}

/**
 * "/empresas/importar": a empresa baixa o modelo, sobe a planilha (Nome e
 * Área), confere a prévia e cria um grupo por área, todos num lote. No fim,
 * vai para o painel do lote (/empresas/lote/[id]).
 */
export function ImportPage() {
  const width = useViewportWidth();
  const wide = width >= 860;
  const pad = width >= 600 ? 32 : 20;

  const [people, setPeople] = useState<Person[]>([]);
  const [source, setSource] = useState<Source>('xlsx');
  const [fileName, setFileName] = useState('');
  const [skipped, setSkipped] = useState(0);
  const [mode, setMode] = useState<SplitMode>('area');
  const [dedupe, setDedupe] = useState(false);
  const [prefix, setPrefix] = useState(`Amigo secreto ${new Date().getFullYear()}`);
  const [budgetCents, setBudgetCents] = useState<number | null>(8000);
  const [customBudget, setCustomBudget] = useState('');
  const [exchangeAt, setExchangeAt] = useState<string | null>(null);
  const [dateSheet, setDateSheet] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [resume, setResume] = useState<{ batchId: string; done: string[] } | null>(null);

  // volta do login (ou recarregou a página): retoma a importação
  useEffect(() => {
    const d = loadDraft();
    if (!d) return;
    setPeople(d.people);
    setSource(d.source);
    setFileName(d.fileName);
    setMode(d.mode);
    setDedupe(d.dedupe);
    setPrefix(d.prefix);
    setBudgetCents(d.budgetCents);
    setExchangeAt(d.exchangeAt);
    if (d.batchId) setResume({ batchId: d.batchId, done: d.done ?? [] });
  }, []);

  const plan = useMemo(() => (people.length ? planGroups(people, mode, { dedupe }) : null), [people, mode, dedupe]);
  const hasAreas = people.some((p) => p.area);
  const totalPeople = plan?.groups.reduce((s, g) => s + g.people.length, 0) ?? 0;

  const loaded = (r: { people: Person[]; skipped: number; source: Source }, name: string) => {
    setPeople(r.people);
    setSkipped(r.skipped);
    setSource(r.source);
    setFileName(name);
    setDedupe(false);
    setResume(null);
    setMode(r.people.some((p) => p.area) ? 'area' : 'single');
    saveDraft(null);
  };

  const chooseFile = async () => {
    setError('');
    const file = await pickFile();
    if (!file) return;
    setReading(true);
    try {
      loaded(await readFile(file), file.name);
    } catch (e) {
      setError(e instanceof Error && e.message === 'FORMATO' ? 'Envie o arquivo em .xlsx (Excel) ou .csv. Arquivos .xls antigos: abra no Excel e salve como .xlsx.' : 'Não conseguimos ler esse arquivo. Confira se é o modelo preenchido e tente de novo.');
    } finally {
      setReading(false);
    }
  };

  const usePasted = () => {
    setError('');
    loaded({ ...readPeople(parseDelimited(pasted)), source: 'colado' }, 'Colado do Excel');
    setPasting(false);
  };

  const create = async () => {
    if (!plan || plan.errors.length || !plan.groups.length) return;
    setError('');
    const draft: Draft = { people, source, fileName, mode, dedupe, prefix, budgetCents, exchangeAt, batchId: resume?.batchId, done: resume?.done };
    saveDraft(draft);
    const session = await getSession();
    if (!session) {
      track('auth_required', { origem: 'importar' });
      router.push({ pathname: '/conta', params: { next: '/empresas/importar' } });
      return;
    }
    setCreating(true);
    const done = new Set(resume?.done ?? []);
    try {
      const batchId = resume?.batchId ?? (await createBatch(prefix));
      setResume({ batchId, done: [...done] });
      saveDraft({ ...draft, batchId, done: [...done] });
      const todo = plan.groups.filter((g) => !done.has(g.area));
      setProgress({ done: done.size, total: plan.groups.length });
      for (const g of todo) {
        const r = await createAndDraw({
          name: groupName(prefix, g.area),
          budgetCents,
          exchangeAt,
          singleCycle: true,
          participants: g.people.map((name) => ({ name })),
          exclusions: [],
        });
        await attachGroup(batchId, r.code);
        done.add(g.area);
        setResume({ batchId, done: [...done] });
        saveDraft({ ...draft, batchId, done: [...done] });
        setProgress({ done: done.size, total: plan.groups.length });
      }
      track('batch_imported', { grupos: plan.groups.length, pessoas: totalPeople, origem: source, por_area: mode === 'area' });
      saveDraft(null);
      router.replace({ pathname: '/empresas/lote/[id]', params: { id: batchId } });
    } catch (e) {
      setError(`${friendlyError(e)} ${done.size ? `${done.size} de ${plan.groups.length} grupos já foram criados; tente de novo para criar o resto.` : ''}`.trim());
    } finally {
      setCreating(false);
    }
  };

  const budgetLabel = budgetCents == null ? 'sem valor definido' : `até ${formatBRL(budgetCents)}`;
  const dateLabel = exchangeAt ? new Date(`${exchangeAt}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Head>
        <title>Importar planilha · Amigo Oculto Já! Empresas</title>
        <meta name="robots" content="noindex" />
      </Head>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
          <Nav empresas cta="Criar um grupo só" ctaOrigin="importar_nav" />
          <View style={{ gap: 10, paddingTop: wide ? 24 : 8, paddingBottom: 24, maxWidth: 720 }}>
            <T size={13} weight="bold" color={biz.accentDark} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Importar planilha
            </T>
            <T size={wide ? 40 : 30} weight="extrabold" lineHeight={wide ? 45 : 35} style={{ letterSpacing: -1 }} accessibilityRole="header">
              Todos os times da empresa, sorteados de uma vez.
            </T>
            <T size={17} color={colors.textSecondary} lineHeight={26}>
              Baixe o modelo, preencha com o nome e a área de cada pessoa e envie aqui. Cada área vira um grupo, com o próprio link para mandar no canal do time.
            </T>
          </View>

          <Step n={1} title="Baixe o modelo" done={people.length > 0}>
            <T size={15} color={colors.textSecondary} lineHeight={22}>
              Duas colunas: <T size={15} weight="bold">Nome</T> (obrigatória) e <T size={15} weight="bold">Área</T> (opcional). Não precisa de e-mail, telefone nem CPF.
            </T>
            <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: 'hidden', maxWidth: 420 }} accessibilityLabel="Exemplo de planilha">
              {[
                ['Nome', 'Área'],
                ['Ana Souza', 'Financeiro'],
                ['Bruno Lima', 'Financeiro'],
                ['Diego Rocha', 'Marketing'],
              ].map((r, i) => (
                <View key={r[0]} style={{ flexDirection: 'row', backgroundColor: i === 0 ? biz.accent : i % 2 ? colors.surface : colors.surfaceAlt }}>
                  {r.map((c, j) => (
                    <T key={c} size={14} weight={i === 0 ? 'bold' : 'regular'} color={i === 0 ? '#FFFFFF' : colors.text} style={{ flex: j === 0 ? 1.4 : 1, paddingVertical: 9, paddingHorizontal: 12 }}>
                      {c}
                    </T>
                  ))}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Button label="Baixar modelo (Excel)" variant="biz" onPress={() => { track('template_downloaded', { formato: 'xlsx' }); window.open(TEMPLATE_XLSX, '_blank'); }} style={{ width: 'auto', paddingHorizontal: 24, height: 50 }} />
              <Button label="Baixar em CSV" variant="outline" onPress={() => { track('template_downloaded', { formato: 'csv' }); window.open(TEMPLATE_CSV, '_blank'); }} style={{ width: 'auto', paddingHorizontal: 20, height: 50 }} />
            </View>
            <T size={13} color={colors.textSecondary}>
              O modelo tem uma aba de exemplo e uma de instruções. Preencha a aba Participantes.
            </T>
          </Step>

          <Step n={2} title="Envie a planilha preenchida" done={people.length > 0}>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button label={people.length ? 'Enviar outra planilha' : 'Escolher arquivo (.xlsx ou .csv)'} variant={people.length ? 'outline' : 'biz'} onPress={chooseFile} loading={reading} style={{ width: 'auto', paddingHorizontal: 24, height: 50 }} />
              <Pressable accessibilityRole="button" onPress={() => setPasting((v) => !v)} style={{ height: 50, justifyContent: 'center', paddingHorizontal: 6 }}>
                <T size={15} weight="semibold" color={biz.accentDark} style={{ textDecorationLine: 'underline' }}>
                  {pasting ? 'Fechar' : 'Ou colar do Excel'}
                </T>
              </Pressable>
            </View>
            {pasting ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={pasted}
                  onChangeText={setPasted}
                  multiline
                  placeholder={'Selecione as colunas Nome e Área no Excel, copie e cole aqui.\nAna Souza\tFinanceiro\nBruno Lima\tFinanceiro'}
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Colar nomes e áreas"
                  style={{ minHeight: 160, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: 14, padding: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text, textAlignVertical: 'top' }}
                />
                <Button label="Usar estes nomes" variant="biz" onPress={usePasted} disabled={!pasted.trim()} style={{ width: 'auto', alignSelf: 'flex-start', paddingHorizontal: 24, height: 48 }} />
              </View>
            ) : null}
            {people.length ? (
              <T size={15} color={colors.textSecondary}>
                {fileName}: <T size={15} weight="bold">{people.length} pessoas</T>
                {hasAreas ? ` em ${new Set(people.map((p) => p.area.toLocaleLowerCase('pt-BR')).filter(Boolean)).size} áreas` : ', sem coluna de área'}
                {skipped ? ` · ${skipped} ${skipped === 1 ? 'linha sem nome foi ignorada' : 'linhas sem nome foram ignoradas'}` : ''}
              </T>
            ) : null}
          </Step>

          {plan ? (
            <Step n={3} title="Confira os grupos" done={!plan.errors.length && plan.groups.length > 0}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }} accessibilityRole="radiogroup">
                <Chip label="Um grupo por área" on={mode === 'area'} onPress={() => setMode('area')} />
                <Chip label="Todos num grupo só" on={mode === 'single'} onPress={() => setMode('single')} />
              </View>
              {plan.notices.map((n) => (
                <View key={n} style={{ padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: biz.tintSoft }}>
                  <T size={14} lineHeight={20}>
                    {n}
                  </T>
                </View>
              ))}
              {plan.errors.map((e) => (
                <View key={e} style={{ padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FBE9E4' }}>
                  <T size={14} lineHeight={20} color={colors.accentDark}>
                    {e}
                  </T>
                </View>
              ))}
              {plan.duplicates > 0 && !dedupe ? (
                <Pressable accessibilityRole="button" onPress={() => setDedupe(true)} style={{ alignSelf: 'flex-start' }}>
                  <T size={14} weight="bold" color={biz.accentDark} style={{ textDecorationLine: 'underline' }}>
                    São a mesma pessoa repetida? Manter só uma linha de cada
                  </T>
                </Pressable>
              ) : null}
              <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}>
                {plan.groups.map((g) => (
                  <View key={g.area || 'unico'} style={{ width: wide ? '31.5%' : '100%', padding: 16, borderRadius: 16, backgroundColor: biz.tintSoft, gap: 4 }}>
                    <T size={16} weight="bold" numberOfLines={2}>
                      {groupName(prefix, g.area)}
                    </T>
                    <T size={14} weight="semibold" color={biz.accentDark}>
                      {g.people.length} pessoas
                    </T>
                    <T size={13} color={colors.textSecondary} lineHeight={18} numberOfLines={3}>
                      {names(g.people)}
                    </T>
                  </View>
                ))}
              </View>
            </Step>
          ) : null}

          {plan && !plan.errors.length && plan.groups.length ? (
            <Step n={4} title="Regras do sorteio">
              <View style={{ gap: 6, maxWidth: 480 }}>
                <T size={14} weight="semibold" color={colors.textSecondary}>
                  Nome dos grupos
                </T>
                <UnderlineInput value={prefix} onChangeText={setPrefix} maxLength={40} accessibilityLabel="Nome dos grupos" placeholder="Amigo secreto 2026" />
                <T size={13} color={colors.textSecondary}>
                  Fica assim: {groupName(prefix, plan.groups[0].area)}
                </T>
              </View>
              <View style={{ gap: 8 }}>
                <T size={14} weight="semibold" color={colors.textSecondary}>
                  Valor do presente (o mesmo para todos)
                </T>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} accessibilityRole="radiogroup">
                  {BUDGETS.map(([label, v]) => (
                    <Chip key={label} label={label} on={budgetCents === v && !customBudget} onPress={() => { setCustomBudget(''); setBudgetCents(v); }} />
                  ))}
                  <UnderlineInput
                    value={customBudget}
                    onChangeText={(t) => {
                      const digits = t.replace(/\D/g, '').slice(0, 5);
                      setCustomBudget(digits);
                      if (digits) setBudgetCents(Number(digits) * 100);
                    }}
                    placeholder="Outro (R$)"
                    keyboardType="number-pad"
                    accessibilityLabel="Outro valor em reais"
                    style={{ width: 120, height: 40 }}
                  />
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <T size={14} weight="semibold" color={colors.textSecondary}>
                  Dia da troca (opcional)
                </T>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button label={dateLabel ?? 'Escolher a data'} variant="outline" onPress={() => setDateSheet(true)} style={{ width: 'auto', paddingHorizontal: 20, height: 44 }} />
                  {exchangeAt ? (
                    <Pressable accessibilityRole="button" onPress={() => setExchangeAt(null)}>
                      <T size={14} weight="semibold" color={colors.textSecondary} style={{ textDecorationLine: 'underline' }}>
                        Sem data
                      </T>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View style={{ gap: 10, paddingTop: 8 }}>
                <ErrorText>{error}</ErrorText>
                {progress && creating ? (
                  <View style={{ gap: 6, maxWidth: 480 }}>
                    <T size={15} weight="semibold">
                      Criando e sorteando: {progress.done} de {progress.total} grupos
                    </T>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`, height: '100%', backgroundColor: biz.accent }} />
                    </View>
                  </View>
                ) : null}
                <Button
                  label={resume?.done.length ? `Continuar: criar os ${plan.groups.length - resume.done.length} grupos que faltam` : `Criar ${plan.groups.length} ${plan.groups.length === 1 ? 'grupo' : 'grupos'} e sortear`}
                  variant="biz"
                  onPress={create}
                  loading={creating}
                  style={{ width: wide ? 'auto' : '100%', alignSelf: wide ? 'flex-start' : 'stretch', paddingHorizontal: 28 }}
                />
                <T size={13} color={colors.textSecondary} lineHeight={19}>
                  {totalPeople} pessoas · presente {budgetLabel}
                  {dateLabel ? ` · troca em ${dateLabel}` : ''}. Para criar, entre com Google ou e-mail: os grupos ficam na sua conta. Cada grupo sai com o próprio link.
                </T>
              </View>
            </Step>
          ) : null}
        </View>
        <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad, paddingTop: 24 }}>
          <Footer />
        </View>
      </ScrollView>

      <Sheet visible={dateSheet} onClose={() => setDateSheet(false)} title="Dia da troca" footer={<Button label="Pronto" variant="biz" onPress={() => setDateSheet(false)} />}>
        <Calendar key={dateSheet ? 'aberto' : 'fechado'} value={exchangeAt} onChange={setExchangeAt} />
      </Sheet>
    </View>
  );
}
