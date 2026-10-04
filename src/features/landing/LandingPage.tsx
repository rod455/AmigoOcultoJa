import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Check, EyeOff, WhatsApp } from '@/components/icons';
import { Button, Mark, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { colors } from '@/theme/tokens';

const MAX_W = 1040;

/**
 * Landing page (web). Mesmo sistema visual do app: Figtree, preto #111418,
 * destaque #C63D24, linhas finas, uma ação principal.
 */
export function LandingPage() {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const pad = width >= 600 ? 32 : 20;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: MAX_W, paddingHorizontal: pad }}>
        {/* nav */}
        <View style={{ height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T size={24} weight="extrabold" style={{ letterSpacing: -0.4 }}>
            Tirei!
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Link href="/entrar" asChild>
              <Pressable accessibilityRole="link" style={{ height: 44, paddingHorizontal: 14, justifyContent: 'center' }}>
                <T size={15} weight="semibold">
                  Tenho um convite
                </T>
              </Pressable>
            </Link>
            <Link href="/criar/nome" asChild>
              <Pressable
                accessibilityRole="link"
                onPress={() => track('create_started', { origem: 'lp_nav' })}
                // Link asChild descarta `style` em função: usar objeto
                style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.text, justifyContent: 'center' }}
              >
                <T size={15} weight="bold" color="#FFFFFF">
                  Criar amigo oculto
                </T>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* hero */}
        <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 56 : 40, paddingTop: wide ? 56 : 32, paddingBottom: wide ? 88 : 56 }}>
          <View style={{ flex: 1, gap: 24, width: '100%' }}>
            <Mark scale={0.8} />
            <T size={wide ? 60 : 42} weight="extrabold" lineHeight={wide ? 64 : 46} style={{ letterSpacing: wide ? -1.8 : -1 }} accessibilityRole="header">
              Amigo oculto sem papelzinho.
            </T>
            <T size={wide ? 22 : 18} color={colors.textSecondary} lineHeight={wide ? 32 : 27}>
              Monte o grupo em 1 minuto e mande um link no WhatsApp. Cada um toca no próprio nome, descobre quem tirou e já escolhe o presente. Sem cadastro, sem app, sem ninguém espiando.
            </T>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10, alignItems: wide ? 'center' : 'stretch', maxWidth: 480 }}>
              <Link href="/criar/nome" asChild>
                <Button label="Criar amigo oculto" onPress={() => track('create_started', { origem: 'lp_hero' })} style={{ width: wide ? 260 : '100%' }} />
              </Link>
              <Link href="/entrar" asChild>
                <Button label="Tenho um convite" variant="ghost" style={{ width: wide ? 200 : '100%' }} />
              </Link>
            </View>
            <T size={14} color={colors.textSecondary}>
              Grátis. Funciona no celular, direto do navegador.
            </T>
          </View>
          <PhoneMock />
        </View>

        {/* como funciona */}
        <Section title="Como funciona" eyebrow="3 passos, 1 minuto">
          <Steps wide={wide} />
        </Section>

        {/* por quê */}
        <Section title="Feito para o grupo inteiro usar" eyebrow="Por que o Tirei!">
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 24 : 0, flexWrap: 'wrap' }}>
            <Feature
              wide={wide}
              icon={<EyeOff size={22} />}
              title="Sorteio secreto de verdade"
              text="O resultado é gerado no servidor e cada pessoa só consegue ler o próprio. Nem quem organiza vê quem tirou quem."
            />
            <Feature
              wide={wide}
              icon={<WhatsApp size={22} color={colors.text} />}
              title="Ninguém se cadastra"
              text="O link abre no navegador. A pessoa toca no nome dela e pronto. Quem não abriu recebe um lembrete pelo WhatsApp."
            />
            <Feature
              wide={wide}
              icon={<Check size={22} color={colors.text} strokeWidth={2.4} />}
              title="O presente já vem junto"
              text="Na mesma tela em que descobre quem tirou, a pessoa escolhe até 3 presentes dentro do valor. Quem a tirou vê na hora, com link para comprar."
            />
          </View>
        </Section>

        {/* para quem */}
        <Section title="Para família, amigos e empresa" eyebrow="Para quem">
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
            <Audience title="Família" text="A tia que organiza todo ano manda um link só. Quem está longe participa igual." />
            <Audience title="Turma de amigos" text="Casais que não podem se tirar, valor combinado, troca marcada. Tudo no sorteio." />
            <Audience title="Empresa" text="Até 50 pessoas por grupo. Painel mostra quem já viu e quem ainda falta, sem revelar nada." />
          </View>
        </Section>

        {/* FAQ */}
        <Section title="Perguntas frequentes" eyebrow="Dúvidas">
          <Faq
            items={[
              ['Precisa baixar alguma coisa?', 'Não. Quem organiza cria o grupo aqui no navegador e quem participa só abre o link. O app para iPhone e Android chega em novembro, para quem quiser receber avisos.'],
              ['O organizador consegue ver quem tirou quem?', 'Não. O sorteio acontece no servidor e cada resultado só pode ser lido pelo aparelho da própria pessoa. O painel do organizador mostra apenas quem já abriu, quem já viu e quem já montou a lista.'],
              ['E se alguém sair ou entrar depois do sorteio?', 'O organizador remove ou adiciona a pessoa no painel. O sorteio é reparado com a menor troca possível e só quem teve o resultado alterado vê um aviso ao abrir o link.'],
              ['Como vocês ganham dinheiro?', 'As lojas pagam uma comissão ao Tirei! quando alguém compra pelos links de presente. O preço para quem compra é o mesmo. Isso fica escrito em todas as telas com link.'],
              ['Dá para impedir que casais se tirem?', 'Sim. Na hora de sortear, marque quem não pode se tirar. Se as restrições tornarem o sorteio impossível, o app avisa qual delas trava.'],
            ]}
          />
        </Section>

        {/* CTA final */}
        <View style={{ alignItems: 'center', gap: 20, paddingVertical: wide ? 80 : 56, borderTopWidth: 1, borderTopColor: colors.line }}>
          <T size={wide ? 40 : 30} weight="extrabold" lineHeight={wide ? 46 : 36} align="center" style={{ letterSpacing: -0.8 }}>
            Monte o seu em 1 minuto.
          </T>
          <Link href="/criar/nome" asChild>
            <Button label="Criar amigo oculto" variant="accent" onPress={() => track('create_started', { origem: 'lp_footer' })} style={{ width: 280 }} />
          </Link>
        </View>

        {/* rodapé */}
        <View style={{ paddingVertical: 32, gap: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
          <T size={13} color={colors.textSecondary} lineHeight={19}>
            As lojas pagam comissão ao Tirei! pelos links de presente. O preço para você é o mesmo.
          </T>
          <T size={13} color={colors.textSecondary} lineHeight={19}>
            Os nomes cadastrados pelo organizador são usados só para o sorteio e ficam visíveis apenas para quem tem o link do grupo.
          </T>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', paddingTop: 6 }}>
            <Link href="/app" asChild>
              <Pressable accessibilityRole="link">
                <T size={13} weight="semibold" color={colors.textSecondary}>
                  Abrir como app
                </T>
              </Pressable>
            </Link>
            <T size={13} color={colors.textMuted}>
              © {new Date().getFullYear()} Tirei!
            </T>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingVertical: 40, gap: 28, borderTopWidth: 1, borderTopColor: colors.line }}>
      <View style={{ gap: 8 }}>
        <T size={14} weight="bold" color={colors.textSecondary} style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {eyebrow}
        </T>
        <T size={32} weight="extrabold" lineHeight={36} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {title}
        </T>
      </View>
      {children}
    </View>
  );
}

function Steps({ wide }: { wide: boolean }) {
  const steps = [
    ['Cadastre os nomes', 'Nome do grupo, quem participa, valor do presente e, se quiser, quem não pode se tirar.'],
    ['Sorteie e mande o link', 'Um toque em "Sortear" e o link vai para o grupo do WhatsApp com a mensagem pronta.'],
    ['Cada um descobre e escolhe', 'A pessoa toca no próprio nome, vê quem tirou e escolhe até 3 presentes. Quem a tirou vê a lista na hora.'],
  ];
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 32 : 24 }}>
      {steps.map(([t, d], i) => (
        <View key={t} style={{ flex: 1, gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
            <T size={17} weight="extrabold" color="#FFFFFF">
              {i + 1}
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

function Feature({ icon, title, text, wide }: { icon: React.ReactNode; title: string; text: string; wide: boolean }) {
  return (
    <View style={{ flexBasis: wide ? '30%' : 'auto', flexGrow: 1, gap: 10, paddingVertical: wide ? 0 : 20, borderBottomWidth: wide ? 0 : 1, borderBottomColor: colors.line }}>
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
    <View style={{ flex: 1, padding: 22, borderRadius: 20, backgroundColor: colors.surfaceAlt, gap: 8 }}>
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
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? null : i)} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 }}>
              <T size={18} weight="semibold" style={{ flex: 1 }}>
                {q}
              </T>
              <T size={22} weight="regular" color={colors.textSecondary}>
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

/** Mockup estático da tela 8 dentro de uma moldura de celular. */
function PhoneMock() {
  const rows: Array<[string, string, string]> = [
    ['Fone bluetooth', 'R$ 99 · Amazon', 'Comprar'],
    ['Livro de ficção', 'Opções até R$ 100 · Amazon', 'Ver'],
  ];
  return (
    <View
      style={{
        width: 320,
        borderRadius: 40,
        padding: 10,
        backgroundColor: colors.text,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ borderRadius: 32, backgroundColor: colors.surface, padding: 22, paddingTop: 30, gap: 20, overflow: 'hidden' }}>
        <T size={13} color={colors.textSecondary}>
          Natal da Família · até R$ 100 · 24 de dez
        </T>
        <View style={{ gap: 4 }}>
          <T size={15} color={colors.textSecondary}>
            Carla, você tirou
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T size={34} weight="extrabold" lineHeight={38} style={{ letterSpacing: -1 }}>
              Diego Rocha
            </T>
            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
              <EyeOff size={18} />
            </View>
          </View>
        </View>
        <View style={{ gap: 2 }}>
          <T size={12} weight="bold" color={colors.textSecondary}>
            DIEGO QUER
          </T>
          {rows.map(([t, s, b]) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <View style={{ flex: 1 }}>
                <T size={15} weight="semibold">
                  {t}
                </T>
                <T size={12} color={colors.textSecondary}>
                  {s}
                </T>
              </View>
              <View style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.accent, justifyContent: 'center' }}>
                <T size={13} weight="bold" color="#FFFFFF">
                  {b}
                </T>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 6, backgroundColor: colors.surfaceAlt, marginHorizontal: -22 }} />
        <View style={{ gap: 10 }}>
          <T size={20} weight="extrabold" style={{ letterSpacing: -0.3 }}>
            Escolha seu presente
          </T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['#F6E3DC', '#E3E9F6', '#E2F0EA'].map((c, i) => (
              <View key={c} style={{ flex: 1, borderRadius: 14, borderWidth: 2, borderColor: i === 0 ? colors.text : colors.line, padding: 6, gap: 6 }}>
                <View style={{ height: 54, borderRadius: 10, backgroundColor: c }} />
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, width: '80%' }} />
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, width: '50%' }} />
              </View>
            ))}
          </View>
          <View style={{ height: 48, borderRadius: 24, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
            <T size={15} weight="bold" color="#FFFFFF">
              Pronto, salvar (1 de 3)
            </T>
          </View>
        </View>
      </View>
    </View>
  );
}
