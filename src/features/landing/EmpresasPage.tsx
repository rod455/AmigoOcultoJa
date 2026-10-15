import { Link, router } from 'expo-router';
import Head from 'expo-router/head';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Bell, Check, EyeOff, Gift } from '@/components/icons';
import { BrandSymbol, Button, T, UnderlineInput } from '@/components/ui';
import { Audience, Faq, Feature, Footer, MAX_W, Nav, Section, Steps } from '@/features/landing/LandingPage';
import { track } from '@/lib/analytics';
import { useViewportWidth } from '@/lib/useViewportWidth';
import content from '@/content/empresas.json';
import site from '@/content/site.json';
import { biz, colors, fonts } from '@/theme/tokens';

type Pair = [string, string];

const URL = `${site.url}${content.path}`;
// tudo nesta página leva à criação da empresa (/empresas/importar): lista de
// pessoas por planilha ou digitada, um grupo por área e o painel do RH
const CTA = 'Criar o amigo secreto da empresa';
const START = '/empresas/importar';
const MICROCOPY = 'Grátis · planilha ou lista de nomes · um grupo por área · quem participa não se cadastra';

/** Início do fluxo da empresa: o nome dela já vira o nome dos grupos na importação. */
function CompanyStart({ origin }: { origin: string }) {
  const width = useViewportWidth();
  const row = width >= 600;
  const [name, setName] = useState('');
  const go = () => {
    const empresa = name.trim().replace(/\s+/g, ' ').slice(0, 30);
    track('create_started', { origem: origin, com_nome: empresa.length > 0 });
    router.push(empresa ? { pathname: START, params: { empresa } } : START);
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: row ? 'row' : 'column', gap: 10, alignItems: row ? 'flex-end' : 'stretch' }}>
        <View style={{ flex: row ? 1 : undefined, gap: 4 }}>
          <T size={13} weight="semibold" color={colors.textSecondary} nativeID={`lbl-${origin}`}>
            Nome da empresa
          </T>
          <UnderlineInput
            value={name}
            onChangeText={setName}
            placeholder="ACME Logística"
            maxLength={30}
            returnKeyType="go"
            onSubmitEditing={go}
            accessibilityLabelledBy={`lbl-${origin}`}
            style={{ fontSize: 20, fontFamily: fonts.semibold, height: 48 }}
          />
        </View>
        <Button label="Começar" variant="biz" onPress={go} style={{ width: row ? 200 : '100%' }} />
      </View>
      <T size={13} color={colors.textSecondary}>
        {MICROCOPY}
      </T>
    </View>
  );
}
const CONTACT = `mailto:${site.email}?subject=${encodeURIComponent('Amigo secreto da empresa')}&body=${encodeURIComponent(
  'Olá! Somos da empresa ____, com cerca de ___ pessoas. Queremos organizar o amigo secreto e gostaríamos de saber sobre: ',
)}`;

/** Dados estruturados (schema.org) gerados do mesmo conteúdo da página. */
const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${URL}#page`,
      url: URL,
      name: content.metaTitle,
      description: content.metaDescription,
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${site.url}/#site` },
      about: { '@id': `${site.url}/#app` },
      audience: { '@type': 'BusinessAudience', name: 'Empresas, RH e líderes de equipe no Brasil' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${site.url}/` },
          { '@type': 'ListItem', position: 2, name: 'Amigo secreto na empresa', item: URL },
        ],
      },
    },
    {
      '@type': 'HowTo',
      name: 'Como organizar o amigo secreto da empresa online',
      inLanguage: 'pt-BR',
      totalTime: 'PT5M',
      step: content.steps.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text })),
    },
    {
      '@type': 'FAQPage',
      inLanguage: 'pt-BR',
      mainEntity: (content.faq as Pair[]).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
});

/**
 * "/empresas": amigo secreto corporativo (RH, líderes de time, comitê da
 * festa). Mesmo produto e mesmo fluxo da página inicial; muda a mensagem.
 * Só promete o que o produto faz hoje (src/content/empresas.json); o que não
 * existe ainda (sorteio único acima de 50 pessoas, empresa pagando os
 * presentes) vira contato por e-mail, medido em contact_clicked.
 */
export function EmpresasPage() {
  const width = useViewportWidth();
  const wide = width >= 860;
  const pad = width >= 600 ? 32 : 20;

  const contact = (origem: string) => {
    track('contact_clicked', { origem });
    void Linking.openURL(CONTACT);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Head>
        <title>{content.metaTitle}</title>
        <meta name="description" content={content.metaDescription} />
        <meta property="og:title" content={content.metaTitle} />
        <meta property="og:description" content={content.metaDescription} />
        <meta property="og:image" content={`${site.url}/brand/og.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="og:url" content={URL} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={URL} />
        <script type="application/ld+json">{JSON_LD}</script>
      </Head>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
          <Nav empresas cta="Criar para a empresa" ctaShort="Começar" ctaHref={START} ctaOrigin="empresas_nav" />

          {/* HERO */}
          <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', gap: wide ? 56 : 32, paddingTop: wide ? 48 : 20, paddingBottom: wide ? 72 : 40 }}>
            <View style={{ flex: 1, gap: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', height: 36, paddingLeft: 6, paddingRight: 14, borderRadius: 18, backgroundColor: biz.tint }}>
                <BrandSymbol size={26} empresas />
                <T size={14} weight="bold" color={colors.text}>
                  Para empresas e equipes
                </T>
              </View>
              <T size={wide ? 52 : 36} weight="extrabold" lineHeight={wide ? 57 : 41} style={{ letterSpacing: wide ? -1.6 : -1 }} accessibilityRole="header">
                O amigo secreto da empresa, organizado em 5 minutos.
              </T>
              <T size={wide ? 20 : 17} color={colors.textSecondary} lineHeight={wide ? 30 : 26}>
                Um link no WhatsApp, no Slack, no Teams ou no e-mail. Cada pessoa descobre quem tirou e já deixa a lista de presentes. Ninguém se cadastra, ninguém instala nada e nem o RH vê quem tirou quem.
              </T>
              <CompanyStart origin="empresas_hero" />
              <View style={{ gap: 6 }}>
                <Pressable accessibilityRole="link" onPress={() => contact('empresas_hero')} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                  <T size={14} weight="semibold" color={colors.textSecondary} style={{ textDecorationLine: 'underline' }}>
                    Mais de 50 pessoas num sorteio só? Fale com a gente
                  </T>
                </Pressable>
              </View>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: wide ? 36 : 24, paddingHorizontal: wide ? 36 : 16, borderRadius: 32, backgroundColor: biz.tint }}>
              <PanelMock scale={wide ? 1 : 0.92} />
            </View>
          </View>

          {/* EM RESUMO (resposta direta para buscadores e assistentes de IA) */}
          <Section eyebrowColor={biz.accentDark} eyebrow="Em resumo" title="Amigo secreto corporativo online, grátis e secreto">
            <View style={{ gap: 20 }}>
              <T size={wide ? 19 : 17} lineHeight={wide ? 29 : 26} style={{ maxWidth: 760 }}>
                {content.summary}
              </T>
              <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', columnGap: 32 }}>
                {(content.facts as Pair[]).map(([k, v]) => (
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

          {/* DORES DO RH */}
          <Section eyebrowColor={biz.accentDark} eyebrow="O que costuma dar errado" title="Tudo que dá trabalho no amigo secreto da firma, resolvido.">
            <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', columnGap: 32, rowGap: wide ? 32 : 0 }}>
              {(content.pains as Pair[]).map(([t, d], i) => (
                <View key={t} style={{ width: wide ? '30%' : '100%', flexGrow: 1 }}>
                  <Feature wide={wide} icon={PAIN_ICONS[i % PAIN_ICONS.length]} title={t} text={d} />
                </View>
              ))}
            </View>
          </Section>

          {/* COMO FUNCIONA */}
          <Section eyebrowColor={biz.accentDark} eyebrow="Como funciona" title="Três passos. O resto acontece sozinho.">
            <Steps
              wide={wide}
              items={[
                [content.steps[0][0], content.steps[0][1], '2 minutos'],
                [content.steps[1][0], content.steps[1][1], 'qualquer canal'],
                [content.steps[2][0], content.steps[2][1], 'sem cadastro'],
              ]}
            />
            <View style={{ alignItems: wide ? 'flex-start' : 'stretch', gap: 8, paddingTop: 8 }}>
              <Link href={START} asChild>
                <Button label={CTA} variant="biz" onPress={() => track('create_started', { origem: 'empresas_passos' })} style={{ width: wide ? 360 : '100%' }} />
              </Link>
              <T size={13} color={colors.textSecondary}>
                {MICROCOPY}
              </T>
            </View>
          </Section>

          {/* PARA QUEM */}
          <Section eyebrowColor={biz.accentDark} eyebrow="Quem organiza" title="Do RH ao líder do time.">
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
              {(content.roles as Pair[]).map(([t, d]) => (
                <Audience key={t} title={t} text={d} bg={biz.tint} />
              ))}
            </View>
          </Section>

          {/* DICAS (conteúdo útil: buscas "como organizar amigo secreto na empresa") */}
          <Section eyebrowColor={biz.accentDark} eyebrow="Guia rápido" title="Como organizar o amigo secreto da empresa">
            <View style={{ gap: 0 }}>
              {(content.tips as Pair[]).map(([t, d], i) => (
                <View key={t} style={{ flexDirection: 'row', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <T size={28} weight="extrabold" lineHeight={32} color={biz.accent} style={{ width: 36, letterSpacing: -0.6 }}>
                    {i + 1}
                  </T>
                  <View style={{ flex: 1, gap: 4 }}>
                    <T size={18} weight="bold" accessibilityRole="header" aria-level={3}>
                      {t}
                    </T>
                    <T size={16} color={colors.textSecondary} lineHeight={24}>
                      {d}
                    </T>
                  </View>
                </View>
              ))}
            </View>
          </Section>

          {/* FAQ */}
          <Section eyebrowColor={biz.accentDark} eyebrow="Dúvidas de RH, TI e jurídico" title="Perguntas frequentes">
            <Faq items={content.faq as Pair[]} page="empresas" />
          </Section>
        </View>

        {/* FECHAMENTO */}
        <View style={{ width: '100%', backgroundColor: biz.accent, overflow: 'hidden', alignItems: 'center' }}>
          <View style={{ position: 'absolute', right: wide ? -40 : -48, bottom: wide ? -150 : -110 }}>
            <BrandSymbol size={wide ? 420 : 260} big empresas />
          </View>
          <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad, paddingTop: wide ? 88 : 56, paddingBottom: wide ? 96 : 190, gap: 16 }}>
            <T size={wide ? 60 : 40} weight="extrabold" color="#FFFFFF" lineHeight={wide ? 64 : 44} style={{ letterSpacing: wide ? -2 : -1.2, maxWidth: 620 }} accessibilityRole="header" aria-level={2}>
              Quem será do time?
            </T>
            <T size={wide ? 24 : 19} weight="medium" color="#FFFFFF" lineHeight={wide ? 32 : 26} style={{ maxWidth: 520 }}>
              Suba a lista da equipe e mande o link de cada time no canal dele.
            </T>
            <View style={{ paddingTop: 10, flexDirection: wide ? 'row' : 'column', gap: 12, alignItems: wide ? 'center' : 'flex-start' }}>
              <Link href={START} asChild>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => track('create_started', { origem: 'empresas_fechamento' })}
                  style={{ height: 58, paddingHorizontal: 34, borderRadius: 29, backgroundColor: biz.tint, justifyContent: 'center' }}
                >
                  <T size={18} weight="bold" color={colors.text}>
                    {CTA}
                  </T>
                </Pressable>
              </Link>
              <Pressable accessibilityRole="link" onPress={() => contact('empresas_fechamento')} style={{ height: wide ? 58 : 44, paddingHorizontal: wide ? 8 : 0, justifyContent: 'center' }}>
                <T size={16} weight="bold" color="#FFFFFF" style={{ textDecorationLine: 'underline' }}>
                  Falar com a gente
                </T>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
          <Footer />
        </View>
      </ScrollView>
    </View>
  );
}

const PAIN_ICONS = [
  <EyeOff key="a" size={22} />,
  <Check key="b" size={22} color={colors.text} strokeWidth={2.4} />,
  <Gift key="c" size={24} color={colors.text} strokeWidth={2} />,
  <Check key="d" size={22} color={colors.text} strokeWidth={2.4} />,
  <EyeOff key="e" size={22} />,
  <Bell key="f" size={22} />,
];

/** Painel de quem organiza (o que o RH acompanha), em versão estática. */
function PanelMock({ scale = 1 }: { scale?: number }) {
  const people: Array<[string, 'lista' | 'viu' | 'falta']> = [
    ['Ana Souza', 'lista'],
    ['Bruno Lima', 'lista'],
    ['Carla Dias', 'viu'],
    ['Diego Rocha', 'viu'],
    ['Elisa Prado', 'falta'],
  ];
  const chip = {
    lista: { label: 'Lista pronta', bg: '#E2F0EA', fg: colors.successText },
    viu: { label: 'Já viu', bg: colors.surfaceAlt, fg: colors.text },
    falta: { label: 'Não abriu', bg: '#FBF1E1', fg: colors.warningText },
  } as const;
  const w = Math.round(340 * scale);
  return (
    <View
      style={{ width: w, borderRadius: 24 * scale, backgroundColor: colors.surface, padding: 20 * scale, gap: 14 * scale, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ gap: 2 }}>
        <T size={12 * scale} weight="bold" color={colors.textSecondary} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Painel de quem organiza
        </T>
        <T size={20 * scale} weight="extrabold" style={{ letterSpacing: -0.3 }}>
          Amigo secreto do Financeiro
        </T>
        <T size={13 * scale} color={colors.textSecondary}>
          24 pessoas · até R$ 80 · troca 19 de dez
        </T>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size={13 * scale} weight="semibold">
            Já viram quem tiraram
          </T>
          <T size={13 * scale} weight="bold">
            18 de 24
          </T>
        </View>
        <View style={{ height: 8 * scale, borderRadius: 4 * scale, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
          <View style={{ width: '75%', height: '100%', backgroundColor: biz.accent }} />
        </View>
      </View>
      <View>
        {people.map(([n, s]) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 * scale, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <T size={15 * scale} weight="semibold">
              {n}
            </T>
            <View style={{ height: 26 * scale, paddingHorizontal: 10 * scale, borderRadius: 13 * scale, backgroundColor: chip[s].bg, justifyContent: 'center' }}>
              <T size={12 * scale} weight="bold" color={chip[s].fg}>
                {chip[s].label}
              </T>
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: 44 * scale, borderRadius: 22 * scale, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
        <Bell size={16 * scale} />
        <T size={14 * scale} weight="bold">
          Lembrar quem falta (6)
        </T>
      </View>
    </View>
  );
}
