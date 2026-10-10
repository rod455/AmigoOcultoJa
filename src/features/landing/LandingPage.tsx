import { Link, router } from 'expo-router';
import Head from 'expo-router/head';
import React, { useEffect, useRef, useState } from 'react';
import { useViewportWidth } from '@/lib/useViewportWidth';
import { type DimensionValue, type NativeSyntheticEvent, type NativeScrollEvent, Platform, Pressable, ScrollView, type TextInput, View, type ViewStyle } from 'react-native';
import { Check, Close, EyeOff, WhatsApp } from '@/components/icons';
import { BrandSymbol, Button, Logo, T, UnderlineInput } from '@/components/ui';
import { track } from '@/lib/analytics';
import { loadDraft, saveDraft } from '@/lib/device';
import { colors, fonts } from '@/theme/tokens';

const MAX_W = 1040;

const META_TITLE = 'Amigo Oculto Já! · Sorteio de amigo oculto pelo WhatsApp';
const META_DESC =
  'A surpresa fica. A complicação sai. Monte o grupo, sorteie e mande um link no WhatsApp: cada um toca no próprio nome, descobre quem tirou e já escolhe o presente. Grátis, e quem participa não precisa de cadastro nem de app.';
const CTA = 'Criar meu grupo';
const MICROCOPY = 'Grátis · 3 passos · quem participa não se cadastra';

/**
 * Landing page (web).
 *
 * Estrutura orientada a conversão: promessa específica + formulário inline
 * que já inicia o fluxo (pula a tela 2), redutor de atrito sob o CTA, prova
 * concreta (a mensagem real que o grupo recebe), como funciona, comparação
 * com o papelzinho, objeções em FAQ, CTA repetido e barra fixa no mobile.
 */
export function LandingPage() {
  const width = useViewportWidth();
  const wide = width >= 860;
  const pad = width >= 600 ? 32 : 20;
  const [showSticky, setShowSticky] = useState(false);
  const [daysToXmas, setDaysToXmas] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const xmas = new Date(now.getFullYear(), 11, 24);
    const diff = Math.ceil((xmas.getTime() - now.getTime()) / 86400000);
    setDaysToXmas(diff > 0 && diff < 120 ? diff : null);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setShowSticky(y > 560);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Head>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESC} />
        <meta property="og:title" content={META_TITLE} />
        <meta property="og:description" content={META_DESC} />
        <meta property="og:image" content="https://amigoocultoja.com.br/brand/og.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="og:url" content="https://amigoocultoja.com.br/" />
        <link rel="canonical" href="https://amigoocultoja.com.br/" />
      </Head>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }} onScroll={onScroll} scrollEventThrottle={100}>
        <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
          <Nav />

          {/* HERO */}
          <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', gap: wide ? 56 : 32, paddingTop: wide ? 48 : 20, paddingBottom: wide ? 72 : 40 }}>
            <View style={{ flex: 1, gap: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', height: 36, paddingLeft: 6, paddingRight: 14, borderRadius: 18, backgroundColor: colors.peach }}>
                <BrandSymbol size={26} />
                <T size={14} weight="bold" color={colors.text}>
                  A surpresa fica. A complicação sai.
                </T>
              </View>
              <T size={wide ? 56 : 38} weight="extrabold" lineHeight={wide ? 60 : 42} style={{ letterSpacing: wide ? -1.8 : -1 }} accessibilityRole="header">
                Sorteie o amigo oculto e mande o link no WhatsApp.
              </T>
              <T size={wide ? 20 : 17} color={colors.textSecondary} lineHeight={wide ? 30 : 26}>
                Cada um toca no próprio nome, descobre quem tirou e já escolhe o presente. Quem participa não precisa de cadastro nem de app. Nem quem organiza vê quem tirou quem.
              </T>
              <HeroForm origin="lp_hero" />
              <TrustRow />
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: wide ? 28 : 20, paddingLeft: wide ? 96 : 12, paddingRight: wide ? 36 : 12, borderRadius: 32, backgroundColor: colors.peach, overflow: 'hidden' }}>
              <PhoneMock scale={wide ? 1 : 0.85} />
              {wide ? (
                <View style={{ position: 'absolute', left: 14, bottom: 28 }}>
                  <BrandSymbol size={92} />
                </View>
              ) : null}
            </View>
          </View>

          {/* O QUE O GRUPO RECEBE */}
          <Section eyebrow="O que o grupo recebe" title="Uma mensagem só. Cada pessoa descobre o seu em 2 toques.">
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 40 : 24, alignItems: wide ? 'flex-start' : 'stretch' }}>
              <View style={{ flex: 1, gap: 14 }}>
                <T size={15} weight="semibold" color={colors.textSecondary}>
                  Isso vai pronto para o grupo, com um toque em "Enviar no WhatsApp":
                </T>
                <WhatsAppBubble />
                <T size={15} color={colors.textSecondary} lineHeight={23}>
                  Quem abre o link escolhe o próprio nome na lista e vê na hora quem tirou. O nome fica ligado ao aparelho da pessoa: ninguém abre o resultado dos outros.
                </T>
              </View>
              <View style={{ flex: 1, gap: 12 }}>
                <FactRow n="3" label="passos para criar: nome do grupo, pessoas, valor." />
                <FactRow n="0" label="cadastros para quem participa. Quem organiza entra com Google, Apple ou e-mail." />
                <FactRow n="1" label="link no grupo. Quem não abriu recebe um lembrete seu." />
                <FactRow n="50" label="pessoas por grupo, com casais que não podem se tirar." />
              </View>
            </View>
          </Section>

          {/* COMO FUNCIONA */}
          <Section eyebrow="Como funciona" title="Você monta. O resto acontece sozinho.">
            <Steps wide={wide} />
            <View style={{ alignItems: wide ? 'flex-start' : 'stretch', gap: 8, paddingTop: 8 }}>
              <Link href="/criar/nome" asChild>
                <Button label={CTA} onPress={() => track('create_started', { origem: 'lp_steps' })} style={{ width: wide ? 300 : '100%' }} />
              </Link>
              <T size={13} color={colors.textSecondary}>
                {MICROCOPY}
              </T>
            </View>
          </Section>

          {/* PAPELZINHO VS AMIGO OCULTO JÁ! */}
          <Section eyebrow="Por que trocar o papelzinho" title="Tudo que dá errado no papelzinho, resolvido.">
            <Compare wide={wide} />
          </Section>

          {/* POR QUÊ */}
          <Section eyebrow="Feito para o grupo inteiro usar" title="Sem download, sem spoiler, sem presente errado.">
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 24 : 0 }}>
              <Feature wide={wide} icon={<EyeOff size={22} />} title="Sorteio secreto de verdade" text="O resultado é gerado no servidor e cada pessoa só consegue ler o próprio. Nem quem organiza vê quem tirou quem. Testado, não prometido." />
              <Feature wide={wide} icon={<WhatsApp size={22} color={colors.text} />} title="Quem participa não se cadastra" text="O link abre no navegador do celular. A pessoa toca no nome dela e pronto. No painel você vê quem ainda não abriu e lembra só essas pessoas." />
              <Feature wide={wide} icon={<Check size={22} color={colors.text} strokeWidth={2.4} />} title="O presente já vem junto" text="Na mesma tela em que descobre quem tirou, a pessoa escolhe até 3 presentes dentro do valor. Quem a tirou vê a lista na hora, com link para comprar." />
            </View>
          </Section>

          {/* PARA QUEM */}
          <Section eyebrow="Para quem" title="Família, amigos, trabalho.">
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
              <Audience title="Família" text="Quem organiza todo ano manda um link só. Quem mora longe participa igual. A tia que não entende de app só toca no nome dela." />
              <Audience title="Turma de amigos" text="Casais que não podem se tirar, valor combinado, data marcada. Se alguém furar, você tira a pessoa e o sorteio se ajusta com a menor troca possível." />
              <Audience title="Trabalho" text="Até 50 pessoas por grupo. O painel mostra quem já viu e quem ainda falta, sem revelar nada a ninguém." />
            </View>
          </Section>

          {/* FAQ */}
          <Section eyebrow="Dúvidas" title="Perguntas frequentes">
            <Faq
              items={[
                ['É grátis mesmo?', 'Sim. Criar o grupo, sortear, mandar o link, montar a lista de presentes: tudo grátis, sem limite de grupos. O Amigo Oculto Já! ganha uma comissão das lojas quando alguém compra pelos links de presente. O preço para quem compra é o mesmo.'],
                ['Precisa baixar alguma coisa ou criar conta?', 'Quem participa não: só abre o link, sem senha e sem e-mail. Quem organiza monta tudo aqui no navegador e, na hora de sortear, entra com Google, Apple ou e-mail (pedimos só nome e e-mail) para acompanhar o grupo de qualquer aparelho. O app para iPhone e Android está a caminho.'],
                ['Quem organiza consegue ver quem tirou quem?', 'Não. O sorteio acontece no servidor e cada resultado só pode ser lido pelo aparelho da própria pessoa. O painel mostra apenas quem já abriu, quem já viu e quem já montou a lista.'],
                ['E se alguém sair ou entrar depois do sorteio?', 'Você remove ou adiciona a pessoa no painel. O sorteio é reparado com a menor troca possível e só quem teve o resultado alterado vê um aviso ao abrir o link. Ninguém mais precisa fazer nada.'],
                ['Dá para impedir que casais se tirem?', 'Sim. Na hora de sortear, marque quem não pode se tirar. Se as restrições tornarem o sorteio impossível, o app avisa qual delas trava.'],
                ['Alguém escolheu o meu nome por engano. E agora?', 'Peça para quem organiza: no painel dá para liberar o nome em um toque, e você escolhe de novo no seu celular.'],
                ['Funciona para quem não tem WhatsApp?', 'Funciona. O link é um endereço normal: pode ir por SMS, e-mail ou qualquer mensageiro. O botão do WhatsApp só deixa a mensagem pronta.'],
              ]}
            />
          </Section>

        </View>

        {/* CAMPANHA "QUEM SERÁ?" (faixa vermelha, largura total) */}
        <Campaign wide={wide} pad={pad} daysToXmas={daysToXmas} />

        <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
          <Footer />
        </View>
      </ScrollView>

      {/* barra fixa (mobile web) */}
      {!wide && showSticky ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
          <Link href="/criar/nome" asChild>
            <Button label={CTA} onPress={() => track('create_started', { origem: 'lp_sticky' })} />
          </Link>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */

/** Peça principal da campanha (guia §9): fundo vermelho, texto branco, botão pêssego, símbolo ampliado e cortado. */
function Campaign({ wide, pad, daysToXmas }: { wide: boolean; pad: number; daysToXmas: number | null }) {
  const sym = wide ? 460 : 280;
  return (
    <View style={{ width: '100%', backgroundColor: colors.accent, overflow: 'hidden', alignItems: 'center' }}>
      <View style={{ position: 'absolute', right: wide ? -40 : -48, bottom: wide ? -150 : -110 }}>
        <BrandSymbol size={sym} big />
      </View>
      <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad, paddingTop: wide ? 96 : 56, paddingBottom: wide ? 104 : 200, gap: 18 }}>
        {daysToXmas ? (
          <T size={14} weight="bold" color="#FFFFFF" style={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Faltam {daysToXmas} dias para o Natal
          </T>
        ) : null}
        <T size={wide ? 76 : 52} weight="extrabold" color="#FFFFFF" lineHeight={wide ? 80 : 56} style={{ letterSpacing: wide ? -2.4 : -1.6 }} accessibilityRole="header">
          Quem será?
        </T>
        <T size={wide ? 28 : 22} weight="medium" color="#FFFFFF" lineHeight={wide ? 36 : 29} style={{ maxWidth: 440 }}>
          Seu amigo oculto começa aqui.
        </T>
        <View style={{ paddingTop: 10, alignItems: 'flex-start' }}>
          <Link href="/criar/nome" asChild>
            <Pressable
              accessibilityRole="link"
              onPress={() => track('create_started', { origem: 'lp_campanha' })}
              style={{ height: 58, paddingHorizontal: 34, borderRadius: 29, backgroundColor: colors.peach, justifyContent: 'center' }}
            >
              <T size={18} weight="bold" color={colors.text}>
                {CTA}
              </T>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

function Nav() {
  const wide = useViewportWidth() >= 860;
  return (
    <View style={{ height: wide ? 100 : 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link href="/" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Amigo Oculto Já!, início">
          <Logo height={wide ? 68 : 46} />
        </Pressable>
      </Link>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {wide ? (
          <Link href="/entrar" asChild>
            <Pressable accessibilityRole="link" style={{ height: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
              <T size={15} weight="semibold">
                Tenho um convite
              </T>
            </Pressable>
          </Link>
        ) : null}
        <Link href="/criar/nome" asChild>
          <Pressable accessibilityRole="link" onPress={() => track('create_started', { origem: 'lp_nav' })} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center' }}>
            <T size={15} weight="bold" color="#FFFFFF">
              {CTA}
            </T>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

/** Formulário inline: nome do grupo → já entra no passo 2 (pessoas). */
function HeroForm({ origin }: { origin: string }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<TextInput>(null);
  const width = useViewportWidth();
  const row = width >= 600;

  const go = async () => {
    const n = name.trim().replace(/\s+/g, ' ');
    setBusy(true);
    track('create_started', { origem: origin, com_nome: n.length > 0 });
    try {
      if (n.length >= 2) {
        const d = await loadDraft();
        await saveDraft({ ...d, name: n });
        track('group_name_set', { origem: origin });
        router.push('/criar/pessoas');
      } else {
        router.push('/criar/nome');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: row ? 'row' : 'column', gap: 10, alignItems: row ? 'flex-end' : 'stretch' }}>
        <View style={{ flex: row ? 1 : undefined, gap: 4 }}>
          <T size={13} weight="semibold" color={colors.textSecondary} nativeID={`lbl-${origin}`}>
            Nome do grupo
          </T>
          <UnderlineInput
            ref={ref}
            value={name}
            onChangeText={setName}
            placeholder="Natal da Família"
            maxLength={60}
            returnKeyType="go"
            onSubmitEditing={go}
            accessibilityLabelledBy={`lbl-${origin}`}
            style={{ fontSize: 20, fontFamily: fonts.semibold, height: 48 }}
          />
        </View>
        <Button label={CTA} onPress={go} loading={busy} style={{ width: row ? 260 : '100%' }} />
      </View>
      <T size={13} color={colors.textSecondary}>
        {MICROCOPY}
      </T>
    </View>
  );
}

function TrustRow({ center }: { center?: boolean }) {
  const items = ['Quem participa não baixa app', 'Nem quem organiza vê o resultado', 'Até 50 pessoas', 'Lista de presentes com link'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: center ? 'center' : 'flex-start' }}>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.surfaceAlt }}>
          <Check size={12} color={colors.successText} />
          <T size={13} weight="semibold" color={colors.text}>
            {t}
          </T>
        </View>
      ))}
    </View>
  );
}

function FactRow({ n, label }: { n: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <T size={34} weight="extrabold" lineHeight={38} style={{ width: 56, letterSpacing: -1 }}>
        {n}
      </T>
      <T size={16} color={colors.textSecondary} lineHeight={23} style={{ flex: 1 }}>
        {label}
      </T>
    </View>
  );
}

/** A mensagem real da tela 5, no visual de um balão do WhatsApp. */
function WhatsAppBubble() {
  return (
    <View style={{ backgroundColor: '#E7F8EE', borderRadius: 18, borderTopLeftRadius: 4, padding: 16, gap: 6, maxWidth: 420, alignSelf: 'flex-start', width: '100%' }} accessibilityLabel="Exemplo da mensagem enviada ao grupo">
      <T size={16} lineHeight={23}>
        Amigo oculto do{' '}
        <T size={16} weight="bold">
          Natal da Família
        </T>{' '}
        tá valendo!
      </T>
      <T size={16} lineHeight={23}>
        Valor: até R$ 100 · Troca: 24 de dez
      </T>
      <T size={16} lineHeight={23} style={{ paddingTop: 6 }}>
        Toque no link, escolha seu nome e descubra quem você tirou:
      </T>
      <T size={16} lineHeight={23} color="#0B57D0" style={{ textDecorationLine: 'underline' }}>
        amigoocultoja.com.br/g/K7MXQ2
      </T>
      <T size={11} color={colors.textMuted} align="right" style={{ paddingTop: 4 }}>
        10:42 ✓✓
      </T>
    </View>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const width = useViewportWidth();
  const wide = width >= 860;
  return (
    <View style={{ paddingVertical: wide ? 56 : 40, gap: 28, borderTopWidth: 1, borderTopColor: colors.line }}>
      <View style={{ gap: 8, maxWidth: 720 }}>
        <T size={13} weight="bold" color={colors.accentDark} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {eyebrow}
        </T>
        <T size={wide ? 34 : 28} weight="extrabold" lineHeight={wide ? 40 : 33} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {title}
        </T>
      </View>
      {children}
    </View>
  );
}

function Steps({ wide }: { wide: boolean }) {
  const steps: Array<[string, string, string]> = [
    ['Monte o grupo', 'Nome do grupo, quem participa, valor do presente e, se quiser, quem não pode se tirar.', '3 passos'],
    ['Sorteie e envie o convite', 'Toque em "Sortear", entre com Google, Apple ou e-mail e a mensagem vai pronta para o grupo do WhatsApp.', '1 mensagem'],
    ['Cada um descobre e escolhe', 'A pessoa toca no próprio nome, vê quem tirou e escolhe até 3 presentes. Quem a tirou vê a lista na hora.', 'sem cadastro'],
  ];
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 32 : 24 }}>
      {steps.map(([t, d, tag], i) => (
        <View key={t} style={{ flex: 1, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
              <T size={16} weight="extrabold" color="#FFFFFF">
                {i + 1}
              </T>
            </View>
            <T size={13} weight="bold" color={colors.textSecondary} style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {tag}
            </T>
          </View>
          <T size={20} weight="bold">
            {t}
          </T>
          <T size={16} color={colors.textSecondary} lineHeight={24}>
            {d}
          </T>
        </View>
      ))}
    </View>
  );
}

function Compare({ wide }: { wide: boolean }) {
  const rows: Array<[string, string, string]> = [
    ['Alguém tira o próprio nome', 'Refaz tudo', 'Impossível'],
    ['Casal tira um ao outro', 'Refaz tudo', 'Você marca quem não pode'],
    ['Quem organiza vê os papéis', 'Dá para espiar', 'Nem quem organiza vê'],
    ['Alguém mora longe', 'Fica de fora', 'Abre o link de onde estiver'],
    ['Alguém desiste depois', 'Refaz tudo', 'Remove e só quem foi afetado vê aviso'],
    ['"O que você quer ganhar?"', 'Pergunta e entrega a si mesmo', 'Lista com link, quem tirou vê na hora'],
  ];
  const col = (w: DimensionValue): ViewStyle => ({ width: w });
  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 20, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, paddingVertical: 12, paddingHorizontal: 16, gap: 12 }}>
        <T size={13} weight="bold" color={colors.textSecondary} style={[col(wide ? '34%' : '38%'), { textTransform: 'uppercase', letterSpacing: 0.3 }]}>
          Situação
        </T>
        <T size={13} weight="bold" color={colors.textSecondary} style={[col(wide ? '28%' : '26%'), { textTransform: 'uppercase', letterSpacing: 0.3 }]}>
          Papelzinho
        </T>
        <T size={13} weight="bold" color={colors.accentDark} style={[{ flex: 1 }, { textTransform: 'uppercase', letterSpacing: 0.3 }]}>
          Amigo Oculto Já!
        </T>
      </View>
      {rows.map(([s, p, t], i) => (
        <View key={s} style={{ flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line, alignItems: 'center' }}>
          <T size={wide ? 16 : 14} weight="semibold" style={col(wide ? '34%' : '38%')} lineHeight={wide ? 22 : 19}>
            {s}
          </T>
          <View style={[col(wide ? '28%' : '26%'), { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Close size={12} color={colors.textMuted} />
            <T size={wide ? 15 : 13} color={colors.textSecondary} lineHeight={wide ? 21 : 18} style={{ flex: 1 }}>
              {p}
            </T>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Check size={13} color={colors.successText} />
            <T size={wide ? 15 : 13} weight="semibold" lineHeight={wide ? 21 : 18} style={{ flex: 1 }}>
              {t}
            </T>
          </View>
        </View>
      ))}
    </View>
  );
}

function Feature({ icon, title, text, wide }: { icon: React.ReactNode; title: string; text: string; wide: boolean }) {
  return (
    <View style={{ flex: wide ? 1 : undefined, gap: 10, paddingVertical: wide ? 0 : 20, borderBottomWidth: wide ? 0 : 1, borderBottomColor: colors.line }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <T size={20} weight="bold">
        {title}
      </T>
      <T size={16} color={colors.textSecondary} lineHeight={24}>
        {text}
      </T>
    </View>
  );
}

function Audience({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ flex: 1, padding: 22, borderRadius: 20, backgroundColor: colors.peach, gap: 8 }}>
      <T size={20} weight="bold">
        {title}
      </T>
      <T size={15} color={colors.textSecondary} lineHeight={22}>
        {text}
      </T>
    </View>
  );
}

function Faq({ items }: { items: Array<[string, string]> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View>
      {items.map(([q, a], i) => {
        const on = open === i;
        return (
          <View key={q} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => { setOpen(on ? null : i); if (!on) track('faq_opened', { pergunta: i }); }} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 }}>
              <T size={18} weight="semibold" style={{ flex: 1 }}>
                {q}
              </T>
              <T size={22} color={colors.textSecondary}>
                {on ? '−' : '+'}
              </T>
            </Pressable>
            {on ? (
              <T size={16} color={colors.textSecondary} lineHeight={24} style={{ paddingBottom: 18 }}>
                {a}
              </T>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Footer() {
  return (
    <View style={{ paddingVertical: 32, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 10 }}>
        <Logo height={52} />
        <T size={15} weight="semibold" color={colors.textSecondary}>
          A surpresa fica. A complicação sai.
        </T>
      </View>
      <T size={13} color={colors.textSecondary} lineHeight={19}>
        As lojas pagam comissão ao Amigo Oculto Já! pelos links de presente. O preço para você é o mesmo. Como Associado da Amazon, recebemos por compras qualificadas.
      </T>
      <T size={13} color={colors.textSecondary} lineHeight={19}>
        Os nomes cadastrados por quem organiza são usados só para o sorteio e ficam visíveis apenas para quem tem o link do grupo.
      </T>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', paddingTop: 6, alignItems: 'center' }}>
        <Link href="/app" asChild>
          <Pressable accessibilityRole="link">
            <T size={13} weight="semibold" color={colors.textSecondary}>
              Abrir como app
            </T>
          </Pressable>
        </Link>
        <Link href="/entrar" asChild>
          <Pressable accessibilityRole="link">
            <T size={13} weight="semibold" color={colors.textSecondary}>
              Tenho um convite
            </T>
          </Pressable>
        </Link>
        <Link href="/privacidade" asChild>
          <Pressable accessibilityRole="link">
            <T size={13} weight="semibold" color={colors.textSecondary}>
              Privacidade
            </T>
          </Pressable>
        </Link>
        <Link href="/termos" asChild>
          <Pressable accessibilityRole="link">
            <T size={13} weight="semibold" color={colors.textSecondary}>
              Termos de Uso
            </T>
          </Pressable>
        </Link>
        <T size={13} color={colors.textMuted}>
          © {new Date().getFullYear()} Amigo Oculto Já! · amigoocultoja.com.br
        </T>
      </View>
    </View>
  );
}

/** Mockup estático da tela 8 dentro de uma moldura de celular. */
function PhoneMock({ scale = 1 }: { scale?: number }) {
  const rows: Array<[string, string, string]> = [
    ['Fone bluetooth', 'R$ 99 · Amazon', 'Comprar'],
    ['Livro de ficção', 'Opções até R$ 100 · Amazon', 'Ver'],
  ];
  const w = Math.round(320 * scale);
  return (
    <View style={{ width: w, borderRadius: 40 * scale, padding: 10 * scale, backgroundColor: colors.text }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ borderRadius: 32 * scale, backgroundColor: colors.surface, padding: 22 * scale, paddingTop: 30 * scale, gap: 20 * scale, overflow: 'hidden' }}>
        <T size={13 * scale} color={colors.textSecondary}>
          Natal da Família · até R$ 100 · 24 de dez
        </T>
        <View style={{ gap: 4 * scale }}>
          <T size={15 * scale} color={colors.textSecondary}>
            Carla, você tirou
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T size={34 * scale} weight="extrabold" lineHeight={38 * scale} style={{ letterSpacing: -1 }}>
              Diego Rocha
            </T>
            <View style={{ width: 40 * scale, height: 40 * scale, borderRadius: 20 * scale, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
              <EyeOff size={18 * scale} />
            </View>
          </View>
        </View>
        <View style={{ gap: 2 }}>
          <T size={12 * scale} weight="bold" color={colors.textSecondary}>
            DIEGO QUER
          </T>
          {rows.map(([t, s, b]) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * scale, minHeight: 58 * scale, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <View style={{ flex: 1 }}>
                <T size={15 * scale} weight="semibold">
                  {t}
                </T>
                <T size={12 * scale} color={colors.textSecondary}>
                  {s}
                </T>
              </View>
              <View style={{ height: 34 * scale, paddingHorizontal: 14 * scale, borderRadius: 17 * scale, backgroundColor: colors.accent, justifyContent: 'center' }}>
                <T size={13 * scale} weight="bold" color="#FFFFFF">
                  {b}
                </T>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 6, backgroundColor: colors.surfaceAlt, marginHorizontal: -22 * scale }} />
        <View style={{ gap: 10 * scale }}>
          <T size={20 * scale} weight="extrabold" style={{ letterSpacing: -0.3 }}>
            Escolha seu presente
          </T>
          <View style={{ flexDirection: 'row', gap: 8 * scale }}>
            {['#F6E3DC', '#E3E9F6', '#E2F0EA'].map((c, i) => (
              <View key={c} style={{ flex: 1, borderRadius: 14 * scale, borderWidth: 2, borderColor: i === 0 ? colors.text : colors.line, padding: 6 * scale, gap: 6 * scale }}>
                <View style={{ height: 54 * scale, borderRadius: 10 * scale, backgroundColor: c }} />
                <View style={{ height: 8 * scale, borderRadius: 4, backgroundColor: colors.line, width: '80%' }} />
                <View style={{ height: 8 * scale, borderRadius: 4, backgroundColor: colors.line, width: '50%' }} />
              </View>
            ))}
          </View>
          <View style={{ height: 48 * scale, borderRadius: 24 * scale, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <T size={15 * scale} weight="bold" color="#FFFFFF">
              Pronto, salvar (1 de 3)
            </T>
          </View>
        </View>
      </View>
    </View>
  );
}

export const landingMeta = { title: META_TITLE, description: META_DESC, platform: Platform.OS };
