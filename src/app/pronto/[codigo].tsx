import * as Clipboard from 'expo-clipboard';
import { Link, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { WhatsApp } from '@/components/icons';
import { BrandSymbol, Button, Screen, Sub, T, Title } from '@/components/ui';
import { track } from '@/lib/analytics';
import { getPanel, type Panel } from '@/lib/api';
import { inviteMessage, inviteUrl, openWhatsApp } from '@/lib/share';
import { colors } from '@/theme/tokens';

/** Tela 5 — Sorteado (SPronto) */
export default function Pronto() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const code = String(codigo ?? '').toUpperCase();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    getPanel(code)
      .then(setPanel)
      .catch(() => router.replace('/'));
  }, [code]);

  const share = async () => {
    if (!panel) return;
    track('share_whatsapp_clicked', undefined, { code });
    setShared(true);
    await openWhatsApp(
      inviteMessage({ groupName: panel.group.name, code, budgetCents: panel.group.budget_cents, exchangeAt: panel.group.exchange_at }),
    );
  };

  const copy = async () => {
    await Clipboard.setStringAsync(inviteUrl(code));
    track('link_copied', undefined, { code });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen
      padTop={28}
      footer={
        <View style={{ gap: 6 }}>
          <Button label="Enviar convite no WhatsApp" variant="whatsapp" icon={<WhatsApp />} onPress={share} disabled={!panel} />
          <Button label={copied ? 'Link copiado!' : 'Copiar link'} variant="ghost" onPress={copy} />
          {shared ? (
            <Link href={{ pathname: '/painel/[codigo]', params: { codigo: code } }} asChild>
              <Button label="Ver quem já entrou" variant="ghost" />
            </Link>
          ) : null}
        </View>
      }
    >
      <View style={{ flexGrow: 1, justifyContent: 'center', gap: 20, paddingVertical: 24 }}>
        <View style={{ width: 112, height: 112, borderRadius: 28, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }}>
          <BrandSymbol size={78} />
        </View>
        <Title size={38}>Pronto, sorteado!</Title>
        <Sub>Seu grupo está pronto. Agora é só convidar a turma: cada um toca no próprio nome e descobre quem tirou.</Sub>
        <View style={{ paddingTop: 8, gap: 2 }}>
          <T size={14} weight="semibold" color={colors.textSecondary}>
            Link do grupo
          </T>
          <T size={17} weight="semibold" selectable>
            {inviteUrl(code).replace(/^https?:\/\//, '')}
          </T>
        </View>
      </View>
    </Screen>
  );
}
