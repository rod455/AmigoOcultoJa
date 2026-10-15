import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { Calendar } from '@/components/Calendar';
import { Check } from '@/components/icons';
import { Sheet } from '@/components/Sheet';
import { Button, ErrorText, T, UnderlineInput } from '@/components/ui';
import { Footer, MAX_W, Nav } from '@/features/landing/LandingPage';
import { track } from '@/lib/analytics';
import { attachGroup, createAndDraw, createBatch, friendlyError, setPersonalInvites } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { formatBRL } from '@/lib/format';
import { groupName, MAX_PER_GROUP, type Person, pickSheet, planGroups, readPeople, type SplitMode, parseDelimited } from '@/lib/planilha';
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

/** Os passos do cadastro, na ordem. A abertura (stage 0) mostra todos antes de começar. */
const STEPS = [
  {
    title: 'Quem participa',
    short: 'Participantes',
    text: 'Suba a planilha (tem um modelo pronto para baixar) ou digite os nomes. Só o nome e, se quiser, a área de cada pessoa.',
    event: 'participantes',
  },
  {
    title: 'Dinâmica do jogo',
    short: 'Dinâmica',
    text: 'Um grupo por área, todos num grupo só ou integração entre áreas, em que cada pessoa tira alguém de outra área.',
    event: 'dinamica',
  },
  {
    title: 'Valor e presentes',
    short: 'Valor',
    text: 'O valor do presente e o dia da troca. Cada pessoa monta uma lista com até 3 ideias dentro do valor.',
    event: 'valor',
  },
  {
    title: 'Revisar e sortear',
    short: 'Revisão',
    text: 'Confira tudo, entre com Google ou e-mail e sorteie. Cada grupo sai com o próprio link para mandar à equipe.',
    event: 'revisao',
  },
] as const;

const MODES: Array<{ mode: SplitMode; title: string; text: string; needsArea: boolean }> = [
  {
    mode: 'area',
    title: 'Um grupo por área',
    text: 'Cada área tem o próprio sorteio e o próprio link. Bom para empresas grandes: quem tira convive com quem recebe.',
    needsArea: true,
  },
  {
    mode: 'mixed',
    title: 'Integração entre áreas',
    text: `Um sorteio só, com todo mundo (até ${MAX_PER_GROUP} pessoas), e cada pessoa tira alguém de outra área. Bom para aproximar os times.`,
    needsArea: true,
  },
  {
    mode: 'single',
    title: 'Todos num grupo só',
    text: `Um sorteio com todo mundo, até ${MAX_PER_GROUP} pessoas, sem regra de área. Bom para times pequenos.`,
    needsArea: false,
  },
];

const MODE_LABEL: Record<SplitMode, string> = { area: 'Um grupo por área', mixed: 'Integração entre áreas', single: 'Todos num grupo só' };

type Stage = 0 | 1 | 2 | 3 | 4;
type Source = 'xlsx' | 'csv' | 'colado';
type Draft = {
  stage?: Stage;
  people: Person[];
  source: Source;
  fileName: string;
  mode: SplitMode;
  dedupe: boolean;
  prefix: string;
  personalInvites?: boolean;
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

function Num({ n, done, size = 36 }: { n: number; done?: boolean; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: done ? biz.accent : colors.text, alignItems: 'center', justifyContent: 'center' }}>
      {done ? (
        <Check size={size * 0.44} />
      ) : (
        <T size={size * 0.44} weight="extrabold" color="#FFFFFF">
          {n}
        </T>
      )}
    </View>
  );
}

/** Planilha de exemplo (o formato do modelo). */
function ExampleSheet() {
  return (
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
  );
}

function Pill({ label, on }: { label: string; on?: boolean }) {
  return (
    <View style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? biz.accent : colors.surface, borderWidth: 1.5, borderColor: on ? biz.accent : colors.lineStrong }}>
      <T size={13} weight="bold" color={on ? '#FFFFFF' : colors.text}>
        {label}
      </T>
    </View>
  );
}

function ExampleCard({ title, children, wide }: { title: string; children: React.ReactNode; wide: boolean }) {
  return (
    <View style={{ width: wide ? undefined : '100%', flex: wide ? 1 : undefined, padding: 16, borderRadius: 16, backgroundColor: biz.tintSoft, gap: 10 }}>
      <T size={15} weight="bold">
        {title}
      </T>
      {children}
    </View>
  );
}

/** As três dinâmicas, desenhadas com nomes de exemplo. */
function ExampleModes({ wide }: { wide: boolean }) {
  const line = (a: string, b: string) => (
    <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <T size={13}>{a}</T>
      <T size={13} weight="bold" color={biz.accent}>
        →
      </T>
      <T size={13}>{b}</T>
    </View>
  );
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }} accessibilityLabel="Exemplo das dinâmicas">
      <ExampleCard title="Um grupo por área" wide={wide}>
        {[
          ['Financeiro', 12],
          ['Marketing', 9],
          ['TI', 8],
        ].map(([a, n]) => (
          <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface }}>
            <T size={13} weight="semibold">
              {a}
            </T>
            <T size={13} color={colors.textSecondary}>
              {n} pessoas · 1 link
            </T>
          </View>
        ))}
      </ExampleCard>
      <ExampleCard title="Integração entre áreas" wide={wide}>
        <View style={{ gap: 8, padding: 12, borderRadius: 10, backgroundColor: colors.surface }}>
          {line('Ana (Financeiro)', 'Diego (Marketing)')}
          {line('Diego (Marketing)', 'Carla (TI)')}
          {line('Carla (TI)', 'Bruno (Financeiro)')}
        </View>
        <T size={12} color={colors.textSecondary}>
          Cada um tira alguém de outra área.
        </T>
      </ExampleCard>
      <ExampleCard title="Todos num grupo só" wide={wide}>
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surface, gap: 4 }}>
          <T size={13} weight="semibold">
            Amigo secreto do time
          </T>
          <T size={13} color={colors.textSecondary}>
            30 pessoas · 1 link para todo mundo
          </T>
        </View>
        <T size={12} color={colors.textSecondary}>
          Até 50 pessoas, sem regra de área.
        </T>
      </ExampleCard>
    </View>
  );
}

/** Valor, data e a lista de presentes que cada pessoa monta. */
function ExampleGifts({ wide }: { wide: boolean }) {
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }} accessibilityLabel="Exemplo de valor e lista de presentes">
      <ExampleCard title="Valor e data" wide={wide}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Pill label="R$ 50" />
          <Pill label="R$ 80" on />
          <Pill label="R$ 100" />
          <Pill label="Sem valor" />
        </View>
        <T size={13} color={colors.textSecondary}>
          Troca em 12 de dezembro
        </T>
      </ExampleCard>
      <ExampleCard title="Lista da Ana · até R$ 80" wide={wide}>
        {['Fone de ouvido bluetooth', 'Vale-presente de livraria', 'Caneca térmica'].map((t, i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface }}>
            <T size={13} weight="bold" color={biz.accent}>
              {i + 1}
            </T>
            <T size={13} style={{ flex: 1 }}>
              {t}
            </T>
          </View>
        ))}
      </ExampleCard>
    </View>
  );
}

/** O que sai no fim: grupos sorteados, cada um com o link para mandar. */
function ExampleResult({ wide, company }: { wide: boolean; company: string }) {
  const name = `Amigo secreto ${company || 'ACME'}`;
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }} accessibilityLabel="Exemplo do resultado">
      {[
        ['Financeiro', 12, '7KQ2MX'],
        ['Marketing', 9, 'P4HZ8T'],
      ].map(([a, n, code]) => (
        <ExampleCard key={a} title={`${name} · ${a}`} wide={wide}>
          <T size={13} color={colors.textSecondary}>
            {n} pessoas · até R$ 80 · troca em 12/12
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface }}>
            <T size={13} weight="semibold" color={biz.accentDark} style={{ flex: 1 }} numberOfLines={1}>
              amigoocultoja.com.br/g/{code}
            </T>
            <T size={12} weight="bold" color={colors.textSecondary}>
              Copiar
            </T>
          </View>
        </ExampleCard>
      ))}
    </View>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T size={12} weight="bold" color={colors.textSecondary} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Exemplo
      </T>
      {children}
    </View>
  );
}

function IntroStep({ n, title, text, children }: { n: number; title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, paddingVertical: 24, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Num n={n} />
      <View style={{ flex: 1, gap: 14 }}>
        <T size={21} weight="extrabold" style={{ letterSpacing: -0.3 }} accessibilityRole="header" aria-level={2}>
          {title}
        </T>
        <T size={15} color={colors.textSecondary} lineHeight={22} style={{ maxWidth: 720 }}>
          {text}
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

function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'error' }) {
  return (
    <View style={{ padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: tone === 'error' ? '#FBE9E4' : biz.tintSoft }}>
      <T size={14} lineHeight={20} color={tone === 'error' ? colors.accentDark : colors.text}>
        {children}
      </T>
    </View>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <T size={14} weight="semibold" color={colors.textSecondary}>
      {children}
    </T>
  );
}

function names(people: string[], max = 4): string {
  const shown = people.slice(0, max).join(', ');
  return people.length > max ? `${shown} e mais ${people.length - max}` : shown;
}

/**
 * "/empresas/importar": o cadastro da empresa. Uma abertura com o passo a
 * passo e o botão "Começar o preenchimento"; depois um passo por vez:
 * participantes (planilha ou nomes digitados), dinâmica do jogo, valor e
 * presentes, revisar e sortear. No fim, vai para o painel do lote
 * (/empresas/lote/[id]).
 */
export function ImportPage() {
  const width = useViewportWidth();
  const wide = width >= 860;
  const pad = width >= 600 ? 32 : 20;
  const scroll = useRef<ScrollView>(null);
  const finished = useRef(false);

  // vindo da página de empresas: "?empresa=ACME" vira o nome dos grupos
  const { empresa } = useLocalSearchParams<{ empresa?: string }>();
  // aplicado depois de montar: o HTML estático não tem a query (evita diferença na hidratação)
  const [company, setCompany] = useState('');
  const [stage, setStage] = useState<Stage>(0);
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [source, setSource] = useState<Source>('xlsx');
  const [fileName, setFileName] = useState('');
  const [skipped, setSkipped] = useState(0);
  const [mode, setMode] = useState<SplitMode>('area');
  const [dedupe, setDedupe] = useState(false);
  const [prefix, setPrefix] = useState(`Amigo secreto ${new Date().getFullYear()}`);
  const [personalInvites, setPersonal] = useState(false);
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

  const applyDraft = (d: Draft) => {
    setPeople(d.people);
    setSource(d.source);
    setFileName(d.fileName);
    setMode(d.mode);
    setDedupe(d.dedupe);
    setPrefix(d.prefix);
    setPersonal(!!d.personalInvites);
    setBudgetCents(d.budgetCents);
    if (d.budgetCents != null && !BUDGETS.some(([, v]) => v === d.budgetCents)) setCustomBudget(String(Math.round(d.budgetCents / 100)));
    setExchangeAt(d.exchangeAt);
    if (d.batchId) setResume({ batchId: d.batchId, done: d.done ?? [] });
  };

  // rascunho salvo: voltando do login (ou de uma criação pela metade), vai direto
  // para a revisão; senão, a abertura oferece continuar de onde parou
  useEffect(() => {
    const nome = typeof empresa === 'string' ? empresa.trim().slice(0, 26) : '';
    if (nome) {
      setCompany(nome);
      setPrefix(`Amigo secreto ${nome}`);
    }
    const d = loadDraft();
    if (!d || !d.people?.length) return;
    if (d.stage === 4 || d.batchId) {
      applyDraft(d);
      setStage(4);
    } else setSavedDraft(d);
  }, []);

  // guarda o preenchimento a cada mudança (recarregar a página não perde nada)
  useEffect(() => {
    if (finished.current || stage === 0 || !people.length) return;
    saveDraft({ stage, people, source, fileName, mode, dedupe, prefix, personalInvites, budgetCents, exchangeAt, batchId: resume?.batchId, done: resume?.done });
  }, [stage, people, source, fileName, mode, dedupe, prefix, personalInvites, budgetCents, exchangeAt, resume]);

  const plan = useMemo(() => (people.length ? planGroups(people, mode, { dedupe }) : null), [people, mode, dedupe]);
  const areaCount = useMemo(() => new Set(people.map((p) => p.area.toLocaleLowerCase('pt-BR')).filter(Boolean)).size, [people]);
  const hasAreas = areaCount > 0;
  const totalPeople = plan?.groups.reduce((s, g) => s + g.people.length, 0) ?? 0;
  const planOk = !!plan && !plan.errors.length && plan.groups.length > 0;
  const recommended: SplitMode = !hasAreas ? 'single' : people.length > MAX_PER_GROUP || areaCount < 2 ? 'area' : 'mixed';
  const canEnter = (s: Stage) => s <= 1 || (s === 2 && people.length > 0) || (s >= 3 && planOk);

  const goTo = (s: Stage) => {
    if (!canEnter(s)) return;
    setError('');
    setStage(s);
    track('import_step', { passo: s === 0 ? 'inicio' : STEPS[s - 1].event, dinamica: s > 2 ? mode : undefined, pessoas: people.length || undefined });
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const start = (fromDraft: boolean) => {
    if (fromDraft && savedDraft) {
      applyDraft(savedDraft);
      const s = savedDraft.stage && savedDraft.stage > 0 ? savedDraft.stage : 1;
      setSavedDraft(null);
      setStage(s);
      track('import_step', { passo: STEPS[s - 1].event, retomou: true });
      return;
    }
    if (savedDraft) saveDraft(null);
    setSavedDraft(null);
    goTo(1);
  };

  const loaded = (r: { people: Person[]; skipped: number; source: Source }, name: string) => {
    setPeople(r.people);
    setSkipped(r.skipped);
    setSource(r.source);
    setFileName(name);
    setDedupe(false);
    setResume(null);
    const areas = new Set(r.people.map((p) => p.area.toLocaleLowerCase('pt-BR')).filter(Boolean)).size;
    setMode(!areas ? 'single' : r.people.length > MAX_PER_GROUP || areas < 2 ? 'area' : 'mixed');
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
    loaded({ ...readPeople(parseDelimited(pasted)), source: 'colado' }, 'Lista digitada');
    setPasting(false);
  };

  const create = async () => {
    if (!plan || !planOk) return;
    setError('');
    const draft: Draft = { stage: 4, people, source, fileName, mode, dedupe, prefix, personalInvites, budgetCents, exchangeAt, batchId: resume?.batchId, done: resume?.done };
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
          exclusions: g.exclusions ?? [],
        });
        await attachGroup(batchId, r.code);
        if (personalInvites) await setPersonalInvites(r.code, true);
        done.add(g.area);
        setResume({ batchId, done: [...done] });
        saveDraft({ ...draft, batchId, done: [...done] });
        setProgress({ done: done.size, total: plan.groups.length });
      }
      track('batch_imported', { grupos: plan.groups.length, pessoas: totalPeople, origem: source, por_area: mode === 'area', dinamica: mode, convite_individual: personalInvites });
      if (personalInvites) track('personal_invites_set', { ligado: true, pessoas: totalPeople, lote: true, origem: 'importar' });
      finished.current = true;
      saveDraft(null);
      router.replace({ pathname: '/empresas/lote/[id]', params: { id: batchId } });
    } catch (e) {
      setError(`${friendlyError(e)} ${done.size ? `${done.size} de ${plan.groups.length} grupos já foram criados; tente de novo para criar o resto.` : ''}`.trim());
    } finally {
      setCreating(false);
    }
  };

  const budgetLabel = budgetCents == null ? 'Sem valor definido' : `Até ${formatBRL(budgetCents)}`;
  const dateLabel = exchangeAt ? new Date(`${exchangeAt}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : null;
  const groupsLabel = plan?.groups.length === 1 ? '1 grupo' : `${plan?.groups.length ?? 0} grupos`;
  const btnStyle = { width: wide ? ('auto' as const) : ('100%' as const), paddingHorizontal: 28 };

  /* ----------------------------- abertura ----------------------------- */

  const startButtons = savedDraft ? (
    <View style={{ gap: 10 }}>
      <T size={15} color={colors.textSecondary}>
        Você tem um preenchimento salvo neste navegador ({savedDraft.people.length} pessoas).
      </T>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10 }}>
        <Button label="Continuar de onde parei" variant="biz" onPress={() => start(true)} style={btnStyle} />
        <Button label="Começar do zero" variant="outline" onPress={() => start(false)} style={btnStyle} />
      </View>
    </View>
  ) : (
    <Button label="Começar o preenchimento" variant="biz" onPress={() => start(false)} style={{ ...btnStyle, alignSelf: wide ? 'flex-start' : 'stretch' }} />
  );

  const intro = (
    <View style={{ paddingBottom: 16 }}>
      <View style={{ gap: 10, paddingTop: wide ? 24 : 8, paddingBottom: 24, maxWidth: 720 }}>
        <T size={13} weight="bold" color={biz.accentDark} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Cadastro da empresa
        </T>
        <T size={wide ? 40 : 30} weight="extrabold" lineHeight={wide ? 45 : 35} style={{ letterSpacing: -1 }} accessibilityRole="header">
          {company ? `O amigo secreto da ${company} em 4 passos.` : 'O amigo secreto da empresa em 4 passos.'}
        </T>
        <T size={17} color={colors.textSecondary} lineHeight={26}>
          Leva uns 5 minutos. Nada é sorteado antes do último passo, então dá para voltar e mudar o que quiser.
        </T>
        <View style={{ paddingTop: 8 }}>{startButtons}</View>
      </View>

      <IntroStep n={1} title="Quem participa" text="Suba a planilha ou digite os nomes. O modelo tem duas colunas: Nome (obrigatória) e Área (opcional). Não precisa de e-mail, telefone nem CPF.">
        <Example>
          <ExampleSheet />
        </Example>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button label="Baixar modelo (Excel)" variant="outline" onPress={() => { track('template_downloaded', { formato: 'xlsx', origem: 'abertura' }); window.open(TEMPLATE_XLSX, '_blank'); }} style={{ width: 'auto', paddingHorizontal: 22, height: 46 }} />
          <Button label="Baixar em CSV" variant="outline" onPress={() => { track('template_downloaded', { formato: 'csv', origem: 'abertura' }); window.open(TEMPLATE_CSV, '_blank'); }} style={{ width: 'auto', paddingHorizontal: 20, height: 46 }} />
        </View>
      </IntroStep>

      <IntroStep n={2} title="Dinâmica do jogo" text="Escolha como o sorteio funciona: um grupo por área, integração entre áreas (cada pessoa tira alguém de outra área) ou todos num grupo só.">
        <Example>
          <ExampleModes wide={wide} />
        </Example>
      </IntroStep>

      <IntroStep n={3} title="Valor e presentes" text="Defina o valor do presente e o dia da troca. Ao descobrir quem tirou, cada pessoa monta uma lista com até 3 ideias dentro do valor.">
        <Example>
          <ExampleGifts wide={wide} />
        </Example>
      </IntroStep>

      <IntroStep n={4} title="Revisar e sortear" text="Confira tudo, entre com Google ou e-mail e sorteie. Cada grupo sai com o próprio link para mandar no canal da equipe, e o painel da empresa mostra quem já viu.">
        <Example>
          <ExampleResult wide={wide} company={company} />
        </Example>
      </IntroStep>

      <View style={{ gap: 12, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.line }}>
        {startButtons}
        <T size={13} color={colors.textSecondary} lineHeight={19}>
          Grátis. Quem participa não precisa criar conta; só quem organiza entra com Google ou e-mail, no último passo.
        </T>
      </View>
    </View>
  );

  /* ------------------------------ passos ------------------------------ */

  const stepper = (
    <View style={{ gap: 12, paddingTop: wide ? 16 : 4, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="tablist">
        {STEPS.map((s, i) => {
          const n = (i + 1) as Stage;
          const active = n === stage;
          const reachable = canEnter(n) && !creating;
          return (
            <Pressable
              key={s.title}
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled: !reachable }}
              accessibilityLabel={`Passo ${n}: ${s.title}`}
              disabled={!reachable}
              onPress={() => goTo(n)}
              style={{ flex: 1, gap: 6 }}
            >
              <View style={{ height: 6, borderRadius: 3, backgroundColor: n <= stage ? biz.accent : colors.surfaceAlt }} />
              <T size={12} weight={active ? 'bold' : 'semibold'} color={active ? biz.accentDark : colors.textSecondary} numberOfLines={1}>
                {wide ? `${n}. ${s.title}` : s.short}
              </T>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 4, paddingTop: 8 }}>
        <T size={13} weight="bold" color={biz.accentDark} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Passo {stage} de 4
        </T>
        <T size={wide ? 32 : 26} weight="extrabold" lineHeight={wide ? 38 : 31} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {stage > 0 ? STEPS[stage - 1].title : ''}
        </T>
      </View>
    </View>
  );

  const step1 = (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 12 }}>
        <T size={16} color={colors.textSecondary} lineHeight={24}>
          Use o nosso modelo: duas colunas, <T size={16} weight="bold">Nome</T> (obrigatória) e <T size={16} weight="bold">Área</T> (opcional). Não precisa de e-mail, telefone nem CPF.
        </T>
        <ExampleSheet />
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
          <Pressable accessibilityRole="link" onPress={() => { track('template_downloaded', { formato: 'xlsx' }); window.open(TEMPLATE_XLSX, '_blank'); }}>
            <T size={15} weight="bold" color={biz.accentDark} style={{ textDecorationLine: 'underline' }}>
              Baixar modelo (Excel)
            </T>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => { track('template_downloaded', { formato: 'csv' }); window.open(TEMPLATE_CSV, '_blank'); }}>
            <T size={15} weight="bold" color={biz.accentDark} style={{ textDecorationLine: 'underline' }}>
              Baixar em CSV
            </T>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Label>Já tem a lista?</Label>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10 }}>
          <Button label={people.length && source !== 'colado' ? 'Enviar outra planilha' : 'Enviar planilha (.xlsx ou .csv)'} variant={people.length ? 'outline' : 'biz'} onPress={chooseFile} loading={reading} style={btnStyle} />
          <Button label={pasting ? 'Fechar' : 'Digitar ou colar os nomes'} variant="outline" onPress={() => setPasting((v) => !v)} style={btnStyle} />
        </View>
        {pasting ? (
          <View style={{ gap: 10 }}>
            <TextInput
              value={pasted}
              onChangeText={setPasted}
              multiline
              placeholder={'Um nome por linha. Para dizer a área, use ponto e vírgula:\nAna Souza; Financeiro\nBruno Lima; Financeiro\nDiego Rocha; Marketing\n\nTambém dá para colar as colunas direto do Excel.'}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Digitar ou colar nomes e áreas"
              style={{ minHeight: 180, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: 14, padding: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text, textAlignVertical: 'top' }}
            />
            <Button label="Usar estes nomes" variant="biz" onPress={usePasted} disabled={!pasted.trim()} style={{ width: 'auto', alignSelf: 'flex-start', paddingHorizontal: 24, height: 48 }} />
          </View>
        ) : null}
        <ErrorText>{error}</ErrorText>
        {people.length ? (
          <Note>
            <T size={14} weight="bold">
              {fileName}: {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}
            </T>
            {hasAreas ? ` em ${areaCount} ${areaCount === 1 ? 'área' : 'áreas'}` : ', sem área'}
            {skipped ? ` · ${skipped} ${skipped === 1 ? 'linha sem nome foi ignorada' : 'linhas sem nome foram ignoradas'}` : ''}. {names(people.map((p) => p.name), 5)}.
          </Note>
        ) : null}
      </View>
    </View>
  );

  const step2 = plan ? (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {MODES.map((m) => {
          const on = mode === m.mode;
          const off = m.needsArea && !hasAreas;
          return (
            <Pressable
              key={m.mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: off }}
              disabled={off}
              onPress={() => setMode(m.mode)}
              style={{ flexDirection: 'row', gap: 14, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: on ? biz.accent : colors.line, backgroundColor: on ? biz.tintSoft : colors.surface, opacity: off ? 0.5 : 1, maxWidth: 720 }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? biz.accent : colors.lineStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: biz.accent }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <T size={16} weight="bold">
                    {m.title}
                  </T>
                  {m.mode === recommended && !off ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: biz.accent }}>
                      <T size={11} weight="bold" color="#FFFFFF">
                        Recomendado
                      </T>
                    </View>
                  ) : null}
                </View>
                <T size={14} color={colors.textSecondary} lineHeight={20}>
                  {off ? `${m.text} Precisa da coluna Área na lista.` : m.text}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 10 }}>
        <Label>Como fica</Label>
        {plan.notices.map((n) => (
          <Note key={n}>{n}</Note>
        ))}
        {plan.errors.map((e) => (
          <Note key={e} tone="error">
            {e}
          </Note>
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
                {g.people.length} pessoas{g.exclusions?.length ? ' · cada um tira alguém de outra área' : ''}
              </T>
              <T size={13} color={colors.textSecondary} lineHeight={18} numberOfLines={3}>
                {names(g.people)}
              </T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 6, maxWidth: 480 }}>
        <Label>Nome do amigo secreto</Label>
        <UnderlineInput value={prefix} onChangeText={setPrefix} maxLength={40} accessibilityLabel="Nome do amigo secreto" placeholder="Amigo secreto 2026" />
        <T size={13} color={colors.textSecondary}>
          {plan.groups.length > 1 ? `Cada grupo fica assim: ${groupName(prefix, plan.groups[0].area)}` : 'É o nome que cada pessoa vê ao abrir o link.'}
        </T>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, maxWidth: 720 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="bold">
            Convite individual
          </T>
          <T size={14} color={colors.textSecondary} lineHeight={20}>
            Cada pessoa recebe um link só dela e ninguém consegue escolher o nome de outra. Os links saem numa planilha no painel da empresa, para mandar por e-mail, Slack ou Teams. Desligado, o grupo usa um link só, para colar no canal da equipe.
          </T>
        </View>
        <Switch
          value={personalInvites}
          onValueChange={setPersonal}
          accessibilityLabel="Convite individual"
          trackColor={{ false: colors.lineStrong, true: biz.tint }}
          thumbColor={personalInvites ? biz.accent : '#FFFFFF'}
          // no web, a bolinha ligada usa activeThumbColor (padrão verde-água)
          {...({ activeThumbColor: biz.accent } as object)}
        />
      </View>
    </View>
  ) : null;

  const step3 = (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Label>Valor do presente{plan && plan.groups.length > 1 ? ' (o mesmo para todos os grupos)' : ''}</Label>
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
        <T size={13} color={colors.textSecondary}>
          Entre R$ 50 e R$ 100 costuma funcionar bem no trabalho.
        </T>
      </View>
      <View style={{ gap: 8 }}>
        <Label>Dia da troca (opcional)</Label>
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
        <T size={13} color={colors.textSecondary}>
          Sorteie 2 a 3 semanas antes: dá tempo de montar a lista e de as compras online chegarem.
        </T>
      </View>
      <View style={{ gap: 8, maxWidth: 720 }}>
        <Label>Presentes</Label>
        <Note>
          Ao descobrir quem tirou, cada pessoa monta uma lista com até 3 ideias dentro do valor: produto com link para comprar, vale-presente ou uma ideia livre. Quem é remoto pode deixar o endereço de entrega, que só quem a tirou vê.
        </Note>
      </View>
    </View>
  );

  const summaryRow = (label: string, value: string, s: Stage) => (
    <View key={label} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
      <T size={14} weight="semibold" color={colors.textSecondary} style={{ width: wide ? 180 : 110 }}>
        {label}
      </T>
      <T size={15} weight="bold" lineHeight={21} style={{ flex: 1 }}>
        {value}
      </T>
      {!creating ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Alterar ${label}`} onPress={() => goTo(s)} hitSlop={8}>
          <T size={14} weight="bold" color={biz.accentDark} style={{ textDecorationLine: 'underline' }}>
            Alterar
          </T>
        </Pressable>
      ) : null}
    </View>
  );

  const step4 = plan ? (
    <View style={{ gap: 22 }}>
      <View style={{ maxWidth: 720, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        {summaryRow('Participantes', `${totalPeople} pessoas${hasAreas ? ` em ${areaCount} ${areaCount === 1 ? 'área' : 'áreas'}` : ''} · ${fileName}`, 1)}
        {summaryRow('Dinâmica', `${MODE_LABEL[mode]} · ${groupsLabel}`, 2)}
        {summaryRow('Nome', plan.groups.length > 1 ? `${groupName(prefix, plan.groups[0].area)} e outros` : groupName(prefix, plan.groups[0]?.area ?? ''), 2)}
        {summaryRow('Convite', personalInvites ? 'Individual: um link por pessoa' : 'Um link por grupo', 2)}
        {summaryRow('Valor', budgetLabel, 3)}
        {summaryRow('Dia da troca', dateLabel ?? 'Sem data', 3)}
      </View>
      {!planOk ? <Note tone="error">Falta resolver o passo 2 (Dinâmica do jogo) antes de sortear.</Note> : null}
      <View style={{ gap: 10 }}>
        <ErrorText>{error}</ErrorText>
        {progress && creating ? (
          <View style={{ gap: 6, maxWidth: 480 }}>
            <T size={15} weight="semibold">
              Criando e sorteando: {progress.done} de {progress.total} {progress.total === 1 ? 'grupo' : 'grupos'}
            </T>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`, height: '100%', backgroundColor: biz.accent }} />
            </View>
          </View>
        ) : null}
        <Button
          label={resume?.done.length ? `Continuar: criar os ${plan.groups.length - resume.done.length} grupos que faltam` : `Sortear ${groupsLabel}`}
          variant="biz"
          onPress={create}
          loading={creating}
          disabled={!planOk}
          style={{ ...btnStyle, alignSelf: wide ? 'flex-start' : 'stretch' }}
        />
        <T size={13} color={colors.textSecondary} lineHeight={19}>
          Para sortear, entre com Google ou e-mail: os grupos ficam na sua conta. O sorteio é secreto, nem você vê quem tirou quem. Depois, o painel da empresa mostra os links e o andamento de cada grupo.
        </T>
      </View>
    </View>
  ) : null;

  const nextOk = stage === 1 ? people.length > 0 : stage === 2 ? planOk : true;
  const footer =
    stage > 0 && stage < 4 ? (
      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 28, justifyContent: 'space-between', alignItems: 'center' }}>
        <Button label="Voltar" variant="outline" onPress={() => goTo((stage - 1) as Stage)} style={{ width: 'auto', paddingHorizontal: 22 }} />
        <Button label="Continuar" variant="biz" onPress={() => goTo((stage + 1) as Stage)} disabled={!nextOk} style={{ width: 'auto', flexShrink: 1, paddingHorizontal: 24 }} />
      </View>
    ) : stage === 4 && !creating ? (
      <View style={{ paddingTop: 20 }}>
        <Button label="Voltar" variant="outline" onPress={() => goTo(3)} style={{ width: 'auto', alignSelf: 'flex-start', paddingHorizontal: 22 }} />
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Head>
        <title>Cadastro da empresa · Amigo Oculto Já! Empresas</title>
        <meta name="robots" content="noindex" />
      </Head>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
          <Nav empresas cta="Criar um grupo só" ctaOrigin="importar_nav" />
          {stage === 0 ? (
            intro
          ) : (
            <View style={{ paddingBottom: 16 }}>
              {stepper}
              <View style={{ paddingTop: 18 }}>
                {stage === 1 ? step1 : stage === 2 ? step2 : stage === 3 ? step3 : step4}
              </View>
              {footer}
            </View>
          )}
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
