import { Link, router } from 'expo-router';
import Head from 'expo-router/head';
import React, { useEffect, useRef, useState } from 'react';
import { useViewportWidth } from '@/lib/useViewportWidth';
import { type DimensionValue, type NativeSyntheticEvent, type NativeScrollEvent, Platform, Pressable, ScrollView, type TextInput, View, type ViewStyle } from 'react-native';
import { Check, Close, EyeOff, WhatsApp } from '@/components/icons';
import { BrandSymbol, Button, Logo, T, UnderlineInput } from '@/components/ui';
import { track } from '@/lib/analytics';
import { loadDraft, saveDraft } from '@/lib/device';
import { biz, colors, fonts } from '@/theme/tokens';
import site from '@/content/site.json';

export const MAX_W = 1040;

const META_TITLE = 'Sorteio de Amigo Oculto Online e Grátis | Amigo Oculto Já!';
const META_DESC =
  'Faça o sorteio do amigo oculto (amigo secreto) online e grátis. Mande um link no WhatsApp: cada um descobre quem tirou e já monta a lista de presentes.';

/** Dados estruturados (schema.org) gerados do mesmo conteúdo da página. */
const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${site.url}/#org`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon-512.png`,
      email: site.email,
      slogan: site.tagline,
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#site`,
      name: site.name,
      alternateName: ['Amigo Oculto Já', 'amigoocultoja.com.br'],
      url: site.url,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${site.url}/#org` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${site.url}/#app`,
      name: site.name,
      url: site.url,
      description: site.summary,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Navegador do celular ou do computador',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      featureList: site.facts.map(([k, v]) => `${k}: ${v}`),
      publisher: { '@id': `${site.url}/#org` },
    },
    {
      '@type': 'HowTo',
      name: 'Como fazer o sorteio do amigo oculto online',
      inLanguage: 'pt-BR',
      totalTime: 'PT2M',
      step: site.steps.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text })),
    },
    {
      '@type': 'FAQPage',
      inLanguage: 'pt-BR',
      mainEntity: site.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
});
export const CTA = 'Criar meu grupo';
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
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href="https://amigoocultoja.com.br/" />
        <script type="application/ld+json">{JSON_LD}</script>
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

          {/* EM RESUMO: definição e fatos (resposta direta para buscadores e assistentes de IA) */}
          <Section eyebrow="Em resumo" title="Sorteio de amigo oculto online, grátis e secreto">
            <View style={{ gap: 20 }}>
              <T size={wide ? 19 : 17} lineHeight={wide ? 29 : 26} style={{ maxWidth: 760 }}>
                {site.summary}
              </T>
              <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', columnGap: 32 }}>
                {(site.facts as Array<[string, string]>).map(([k, v]) => (
                  <View key={k} style={{ width: wide ? '47%' : '100%', flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <T size={15} weight="bold" style={{ width: wide ? 150 : 120 }}>
                      {k}
                    </T>
                    <T size={15} color={colors.textSecondary} lineHeight={22} style={{ flex: 1 }}>
                      {v}
                    </T>
                  </View>
                ))}
              </View>
            </View>
          </Section>

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
                <FactRow n="0" label="cadastros para quem participa. Quem organiza entra com Google ou e-mail." />
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
              <Audience title="Trabalho" text="Até 50 pessoas por grupo e um grupo por time. O link vai no WhatsApp, no Slack ou no Teams, e o painel mostra quem ainda falta." link={{ href: '/empresas', label: 'Amigo secreto na empresa' }} />
            </View>
          </Section>

          {/* FAQ */}
          <Section eyebrow="Dúvidas" title="Perguntas frequentes">
            <Faq items={site.faq as Array<[string, string]>} />
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
        <T size={wide ? 76 : 52} weight="extrabold" color="#FFFFFF" lineHeight={wide ? 80 : 56} style={{ letterSpacing: wide ? -2.4 : -1.6 }} accessibilityRole="header" aria-level={2}>
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

/** Topo das páginas. `empresas`: logo azul com o selo "Empresas" (submarca) e botão azul. */
export function Nav({
  empresas = false,
  cta = CTA,
  ctaOrigin = 'lp_nav',
  ctaHref = '/criar/nome',
  ctaShort,
}: {
  empresas?: boolean;
  cta?: string;
  ctaOrigin?: string;
  /** para onde o botão do topo leva (na página de empresas: a criação da empresa) */
  ctaHref?: '/criar/nome' | '/empresas/importar';
  /** texto do botão no celular */
  ctaShort?: string;
}) {
  const wide = useViewportWidth() >= 860;
  return (
    <View style={{ height: wide ? 100 : 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link href={empresas ? '/empresas' : '/'} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={empresas ? 'Amigo Oculto Já! Empresas, início' : 'Amigo Oculto Já!, início'} style={{ flexDirection: 'row', alignItems: 'center', gap: wide ? 12 : 8 }}>
          <Logo height={wide ? 68 : 46} empresas={empresas} />
          {empresas ? (
            <View style={{ height: wide ? 30 : 24, paddingHorizontal: wide ? 12 : 8, borderRadius: 8, backgroundColor: biz.accent, justifyContent: 'center' }}>
              <T size={wide ? 15 : 12} weight="extrabold" color="#FFFFFF" style={{ letterSpacing: 0.2 }}>
                Empresas
              </T>
            </View>
          ) : null}
        </Pressable>
      </Link>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: wide ? 4 : 6 }}>
        {wide && empresas ? (
          <Link href="/" asChild>
            <Pressable accessibilityRole="link" style={{ height: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
              <T size={15} weight="semibold">
                Para família e amigos
              </T>
            </Pressable>
          </Link>
        ) : null}
        {!empresas ? (
          // entrada da submarca Empresas: já no azul dela, para quem vem pelo trabalho
          <Link href="/empresas" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Para empresas"
              style={{ height: wide ? 44 : 36, paddingHorizontal: wide ? 16 : 10, marginRight: wide ? 8 : 0, borderRadius: 22, backgroundColor: biz.tint, borderWidth: 1.5, borderColor: biz.accent, justifyContent: 'center' }}
            >
              <T size={wide ? 15 : 13} weight="bold" color={biz.accent}>
                {wide ? 'Para empresas' : 'Empresas'}
              </T>
            </Pressable>
          </Link>
        ) : null}
        {wide ? (
          <Link href="/entrar" asChild>
            <Pressable accessibilityRole="link" style={{ height: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
              <T size={15} weight="semibold">
                Tenho um convite
              </T>
            </Pressable>
          </Link>
        ) : null}
        <Link href={ctaHref} asChild>
          <Pressable accessibilityRole="link" onPress={() => track('create_started', { origem: ctaOrigin })} style={{ height: wide ? 44 : 36, paddingHorizontal: wide ? 18 : 14, borderRadius: 22, backgroundColor: empresas ? biz.accent : colors.accent, justifyContent: 'center' }}>
            <T size={15} weight="bold" color="#FFFFFF">
              {wide ? cta : ctaShort ?? (empresas ? 'Criar grupo' : cta === CTA ? 'Criar grupo' : cta)}
            </T>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

/** Formulário inline: nome do grupo → já entra no passo 2 (pessoas). */
export function HeroForm({ origin, placeholder = 'Natal da Família', cta = CTA, microcopy = MICROCOPY, empresas = false }: { origin: string; placeholder?: string; cta?: string; microcopy?: string; empresas?: boolean }) {
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
            placeholder={placeholder}
            maxLength={60}
            returnKeyType="go"
            onSubmitEditing={go}
            accessibilityLabelledBy={`lbl-${origin}`}
            style={{ fontSize: 20, fontFamily: fonts.semibold, height: 48 }}
          />
        </View>
        <Button label={cta} variant={empresas ? 'biz' : 'primary'} onPress={go} loading={busy} style={{ width: row ? 260 : '100%' }} />
      </View>
      <T size={13} color={colors.textSecondary}>
        {microcopy}
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

export function Section({ title, eyebrow, children, eyebrowColor = colors.accentDark }: { title: string; eyebrow: string; children: React.ReactNode; eyebrowColor?: string }) {
  const width = useViewportWidth();
  const wide = width >= 860;
  return (
    <View style={{ paddingVertical: wide ? 56 : 40, gap: 28, borderTopWidth: 1, borderTopColor: colors.line }}>
      <View style={{ gap: 8, maxWidth: 720 }}>
        <T size={13} weight="bold" color={eyebrowColor} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {eyebrow}
        </T>
        <T size={wide ? 34 : 28} weight="extrabold" lineHeight={wide ? 40 : 33} style={{ letterSpacing: -0.6 }} accessibilityRole="header" aria-level={2}>
          {title}
        </T>
      </View>
      {children}
    </View>
  );
}

export function Steps({ wide, items }: { wide: boolean; items?: Array<[string, string, string]> }) {
  const steps: Array<[string, string, string]> = items ?? [
    [site.steps[0][0], site.steps[0][1], '3 passos'],
    [site.steps[1][0], site.steps[1][1], '1 mensagem'],
    [site.steps[2][0], site.steps[2][1], 'sem cadastro'],
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
          <T size={20} weight="bold" accessibilityRole="header" aria-level={3}>
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

export function Feature({ icon, title, text, wide }: { icon: React.ReactNode; title: string; text: string; wide: boolean }) {
  return (
    <View style={{ flex: wide ? 1 : undefined, gap: 10, paddingVertical: wide ? 0 : 20, borderBottomWidth: wide ? 0 : 1, borderBottomColor: colors.line }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <T size={20} weight="bold" accessibilityRole="header" aria-level={3}>
        {title}
      </T>
      <T size={16} color={colors.textSecondary} lineHeight={24}>
        {text}
      </T>
    </View>
  );
}

export function Audience({ title, text, link, bg = colors.peach }: { title: string; text: string; link?: { href: '/empresas'; label: string }; bg?: string }) {
  return (
    <View style={{ flex: 1, padding: 22, borderRadius: 20, backgroundColor: bg, gap: 8 }}>
      <T size={20} weight="bold" accessibilityRole="header" aria-level={3}>
        {title}
      </T>
      <T size={15} color={colors.textSecondary} lineHeight={22}>
        {text}
      </T>
      {link ? (
        <Link href={link.href} asChild>
          <Pressable accessibilityRole="link" style={{ paddingTop: 4 }}>
            <T size={15} weight="bold" color={biz.accent} style={{ textDecorationLine: 'underline' }}>
              {link.label}
            </T>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

export function Faq({ items, page = 'inicio' }: { items: Array<[string, string]>; page?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View>
      {items.map(([q, a], i) => {
        const on = open === i;
        return (
          <View key={q} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => { setOpen(on ? null : i); if (!on) track('faq_opened', { pergunta: i, pagina: page }); }} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 }}>
              <T size={18} weight="semibold" style={{ flex: 1 }} accessibilityRole="header" aria-level={3}>
                {q}
              </T>
              <T size={22} color={colors.textSecondary}>
                {on ? '−' : '+'}
              </T>
            </Pressable>
            {/* resposta sempre no HTML (buscadores e IAs leem); só fica oculta na tela */}
            <T size={16} color={colors.textSecondary} lineHeight={24} style={{ paddingBottom: 18, display: on ? 'flex' : 'none' }}>
              {a}
            </T>
          </View>
        );
      })}
    </View>
  );
}

export function Footer() {
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
        <Link href="/empresas" asChild>
          <Pressable accessibilityRole="link">
            <T size={13} weight="semibold" color={colors.textSecondary}>
              Para empresas
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
        <Link href="/suporte" asChild>
          <Pressable accessibilityRole="link">
            <T size={13} weight="semibold" color={colors.textSecondary}>
              Ajuda
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
    ['Fone bluetooth', 'Até R$ 100 · Amazon', 'Comprar'],
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
