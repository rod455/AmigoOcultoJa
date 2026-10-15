import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import { Copy, WhatsApp } from '@/components/icons';
import { Sheet } from '@/components/Sheet';
import { Button, ErrorText, Loading, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { friendlyError, type PersonalInvites, setPersonalInvites } from '@/lib/api';
import { openWhatsApp, personalInviteMessage, personalInviteUrl } from '@/lib/share';
import { colors } from '@/theme/tokens';

/** Planilha Nome; Link (separador ";" como o Excel em português). */
export function downloadPersonalLinks(rows: Array<{ name: string; group?: string; url: string }>, fileName: string) {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const withGroup = rows.some((r) => r.group);
  const header = withGroup ? ['Nome', 'Grupo', 'Link pessoal'] : ['Nome', 'Link pessoal'];
  const lines = [header, ...rows.map((r) => (withGroup ? [r.name, r.group ?? '', r.url] : [r.name, r.url]))];
  const csv = '﻿' + lines.map((l) => l.map(q).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Folha "Convite individual" do painel. Ligado, cada pessoa recebe um link só
 * dela e o link geral do grupo deixa de servir para escolher nome: ninguém
 * consegue abrir o resultado de outra pessoa. Quem já escolheu o nome segue
 * entrando normalmente.
 */
export function PersonalInvitesSheet({
  code,
  groupName,
  on,
  visible,
  onClose,
  onChanged,
}: {
  code: string;
  groupName: string;
  on: boolean;
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<PersonalInvites | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // ao abrir com a opção ligada: busca os links (e gera os de quem entrou depois)
  useEffect(() => {
    if (!visible) return;
    setError('');
    setNotice('');
    if (!on) {
      setData(null);
      return;
    }
    setBusy(true);
    setPersonalInvites(code, true)
      .then(setData)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setBusy(false));
  }, [visible, on, code]);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setError('');
    try {
      const r = await setPersonalInvites(code, next);
      setData(next ? r : null);
      track('personal_invites_set', { ligado: next, pessoas: r.people.length }, { code });
      onChanged();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(''), 2200);
  };
  const people = (data?.people ?? []).filter((p) => p.token);
  const copyOne = async (name: string, token: string) => {
    await Clipboard.setStringAsync(personalInviteUrl(code, token));
    track('link_copied', { origem: 'convite_individual' }, { code });
    flash(`Link de ${name.split(' ')[0]} copiado.`);
  };
  const copyAll = async () => {
    await Clipboard.setStringAsync(people.map((p) => `${p.display_name}: ${personalInviteUrl(code, p.token!)}`).join('\n'));
    track('link_copied', { origem: 'convite_individual_todos', qtd: people.length }, { code });
    flash('Todos os links copiados, um por linha.');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Convite individual">
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T size={16} weight="bold">
              Um link para cada pessoa
            </T>
            <T size={14} color={colors.textSecondary} lineHeight={20}>
              Ninguém consegue escolher o nome de outra pessoa. Bom para a empresa e para grupos grandes. Quem já escolheu o nome continua entrando normalmente.
            </T>
          </View>
          <Switch value={on} onValueChange={toggle} disabled={busy} accessibilityLabel="Convite individual" />
        </View>
        <ErrorText>{error}</ErrorText>
        {on ? (
          busy && !data ? (
            <Loading />
          ) : (
            <View style={{ gap: 10 }}>
              <T size={14} color={colors.textSecondary} lineHeight={20}>
                Mande cada link só para a pessoa (WhatsApp, e-mail, Slack, Teams). O link do grupo passa a mostrar um aviso para usar o link pessoal.
              </T>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Button label="Copiar todos" variant="outline" onPress={copyAll} disabled={!people.length} style={{ width: 'auto', paddingHorizontal: 18, height: 44 }} />
                {Platform.OS === 'web' ? (
                  <Button
                    label="Baixar planilha"
                    variant="outline"
                    onPress={() => downloadPersonalLinks(people.map((p) => ({ name: p.display_name, url: personalInviteUrl(code, p.token!) })), `links-${code}.csv`)}
                    disabled={!people.length}
                    style={{ width: 'auto', paddingHorizontal: 18, height: 44 }}
                  />
                ) : null}
              </View>
              {notice ? (
                <T size={14} color={colors.successText}>
                  {notice}
                </T>
              ) : null}
              {people.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <View style={{ flex: 1 }}>
                    <T size={16} weight="semibold" numberOfLines={1}>
                      {p.display_name}
                    </T>
                    {p.claimed ? (
                      <T size={12} color={colors.successText}>
                        já entrou
                      </T>
                    ) : null}
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Copiar link de ${p.display_name}`} onPress={() => copyOne(p.display_name, p.token!)} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                    <Copy size={16} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Enviar link de ${p.display_name} no WhatsApp`}
                    onPress={() => {
                      track('share_whatsapp_clicked', { origem: 'convite_individual' }, { code });
                      void openWhatsApp(personalInviteMessage({ name: p.display_name, groupName, code, token: p.token! }));
                    }}
                    hitSlop={6}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.whatsapp, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <WhatsApp size={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          )
        ) : null}
      </View>
    </Sheet>
  );
}
