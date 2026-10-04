import * as Clipboard from 'expo-clipboard';
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronRight, Plus, WhatsApp } from '@/components/icons';
import { Sheet } from '@/components/Sheet';
import { Button, ErrorText, Loading, Row, Screen, T, Title, TopBar, UnderlineInput } from '@/components/ui';
import { track } from '@/lib/analytics';
import { addParticipant, friendlyError, getPanel, nudge, type Panel, releaseParticipant, removeParticipant } from '@/lib/api';
import { firstName, groupMeta, joinNames } from '@/lib/format';
import { inviteMessage, inviteUrl, openWhatsApp, reminderMessage } from '@/lib/share';
import { colors } from '@/theme/tokens';

type P = Panel['participants'][number];

function StatusBadge({ status }: { status: P['status'] }) {
  switch (status) {
    case 'list_ready':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Check size={16} color={colors.successText} strokeWidth={2.6} />
          <T size={14} weight="semibold" color={colors.successText}>
            Lista pronta
          </T>
        </View>
      );
    case 'viewed':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Check size={16} color={colors.successText} strokeWidth={2.6} />
          <T size={14} weight="semibold" color={colors.successText}>
            Viu
          </T>
        </View>
      );
    case 'entered':
      return (
        <T size={14} weight="semibold" color={colors.warningText}>
          Entrou, não viu
        </T>
      );
    default:
      return (
        <T size={14} weight="semibold" color={colors.textSecondary}>
          Não abriu
        </T>
      );
  }
}

/** Tela 6 — Painel do organizador (SPainel) */
export default function Painel() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const code = String(codigo ?? '').toUpperCase();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<P | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(() => {
    getPanel(code)
      .then((p) => {
        setPanel(p);
        setError('');
      })
      .catch((e) => setError(friendlyError(e)));
  }, [code]);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 15000);
      return () => clearInterval(id);
    }, [load]),
  );

  if (error && !panel) {
    return (
      <Screen top={<TopBar backTo="/" />} footer={<Button label="Voltar ao início" onPress={() => router.replace('/')} />}>
        <View style={{ paddingTop: 40, gap: 12 }}>
          <Title>Não deu para abrir o painel.</Title>
          <T size={16} color={colors.textSecondary}>
            {error} Só o aparelho que criou o grupo consegue ver o painel.
          </T>
        </View>
      </Screen>
    );
  }

  if (!panel) {
    return (
      <Screen top={<TopBar backTo="/" />}>
        <Loading />
      </Screen>
    );
  }

  const g = panel.group;
  const parts = panel.participants;
  const viewed = parts.filter((p) => p.status === 'viewed' || p.status === 'list_ready').length;
  const pending = parts.filter((p) => p.status === 'not_opened' || p.status === 'entered');
  const pendingNames = pending.map((p) => firstName(p.display_name));

  const remind = async () => {
    track('nudge_sent', { tipo: 'organizador', qtd: pending.length }, { code });
    void nudge(code, 'organizador').catch(() => undefined);
    await openWhatsApp(reminderMessage({ groupName: g.name, code, names: pendingNames }));
  };

  const shareAgain = async () => {
    track('share_whatsapp_clicked', { origem: 'painel' }, { code });
    await openWhatsApp(inviteMessage({ groupName: g.name, code, budgetCents: g.budget_cents, exchangeAt: g.exchange_at }));
  };

  const copy = async () => {
    await Clipboard.setStringAsync(inviteUrl(code));
    track('link_copied', { origem: 'painel' }, { code });
    setNotice('Link copiado.');
    setTimeout(() => setNotice(''), 2000);
  };

  const doRelease = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await releaseParticipant(code, selected.id);
      setSelected(null);
      setNotice(`${firstName(selected.display_name)} pode escolher o nome de novo em outro aparelho.`);
      load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await removeParticipant(code, selected.id);
      setSelected(null);
      setConfirmRemove(false);
      setNotice(
        r.changed_count > 0
          ? `${firstName(selected.display_name)} saiu. ${r.changed_count === 1 ? '1 pessoa teve' : `${r.changed_count} pessoas tiveram`} o resultado alterado e ${r.changed_count === 1 ? 'verá' : 'verão'} o aviso ao abrir o link.`
          : `${firstName(selected.display_name)} saiu do grupo.`,
      );
      load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const doAdd = async () => {
    const n = newName.trim().replace(/\s+/g, ' ');
    if (!n) return;
    setBusy(true);
    try {
      const r = await addParticipant(code, n);
      setAdding(false);
      setNewName('');
      setNotice(`${firstName(n)} entrou no sorteio. ${r.changed_count === 1 ? '1 pessoa teve' : `${r.changed_count} pessoas tiveram`} o resultado alterado. Mande o link de novo no grupo.`);
      load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      top={<TopBar backTo="/" />}
      footer={
        <View style={{ gap: 6 }}>
          {notice ? (
            <T size={14} color={colors.successText} align="center">
              {notice}
            </T>
          ) : null}
          <ErrorText>{error}</ErrorText>
          {pending.length > 0 ? (
            <Button label={`Lembrar ${joinNames(pendingNames.slice(0, 3))}${pendingNames.length > 3 ? ` e mais ${pendingNames.length - 3}` : ''}`} variant="whatsapp" icon={<WhatsApp />} onPress={remind} />
          ) : (
            <Button label="Enviar o link de novo" variant="whatsapp" icon={<WhatsApp />} onPress={shareAgain} />
          )}
          <Button label="Copiar link do grupo" variant="ghost" onPress={copy} />
        </View>
      }
    >
      <View style={{ gap: 24, paddingTop: 12 }}>
        <View style={{ gap: 6 }}>
          <Title size={28}>{g.name}</Title>
          <T size={16} color={colors.textSecondary}>
            {groupMeta(g.budget_cents, g.exchange_at)}
          </T>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <T size={56} weight="extrabold" lineHeight={58} style={{ letterSpacing: -1.5 }}>
            {viewed} de {parts.length}
          </T>
          <T size={16} color={colors.textSecondary}>
            já viram quem tiraram
          </T>
        </View>

        {g.max_version > 1 ? (
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.surfaceAlt }}>
            <T size={14} lineHeight={20}>
              O sorteio foi atualizado depois de uma troca. Quem teve o resultado alterado vê um aviso ao abrir o link.
            </T>
          </View>
        ) : null}

        <View>
          {parts.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.display_name}, opções`} onPress={() => setSelected(p)}>
              <Row>
                <T size={17} style={{ flexGrow: 1 }}>
                  {p.display_name}
                  {p.is_organizer ? (
                    <T size={14} color={colors.textSecondary}>
                      {'  '}você
                    </T>
                  ) : null}
                </T>
                <StatusBadge status={p.status} />
                <ChevronRight size={16} />
              </Row>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setAdding(true)}>
            <Row>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={16} color={colors.text} />
              </View>
              <T size={16} weight="semibold" style={{ flexGrow: 1 }}>
                Adicionar pessoa
              </T>
            </Row>
          </Pressable>
        </View>

        <Link href={{ pathname: '/g/[codigo]', params: { codigo: code } }} asChild>
          <Pressable accessibilityRole="link">
            <T size={15} weight="semibold" color={colors.textSecondary}>
              Ver quem eu tirei →
            </T>
          </Pressable>
        </Link>
      </View>

      {/* Folha: ações por pessoa */}
      <Sheet
        visible={!!selected}
        onClose={() => {
          setSelected(null);
          setConfirmRemove(false);
        }}
        title={selected?.display_name}
      >
        {selected ? (
          <View style={{ gap: 6 }}>
            <T size={15} color={colors.textSecondary} style={{ paddingBottom: 10 }}>
              {selected.status === 'not_opened'
                ? 'Ainda não abriu o link.'
                : selected.status === 'entered'
                  ? 'Escolheu o nome, mas ainda não viu o resultado.'
                  : selected.status === 'viewed'
                    ? 'Já viu quem tirou. Ainda não montou a lista.'
                    : `Já viu quem tirou e montou a lista (${selected.items_count} ${selected.items_count === 1 ? 'item' : 'itens'}).`}
            </T>
            {selected.status !== 'not_opened' && !selected.is_organizer ? (
              <Button label="Liberar o nome para outro aparelho" variant="outline" onPress={doRelease} loading={busy} />
            ) : null}
            {!selected.is_organizer ? (
              confirmRemove ? (
                <Button label={`Confirmar: remover ${firstName(selected.display_name)}`} variant="accent" onPress={doRemove} loading={busy} />
              ) : (
                <Button label="Remover do grupo" variant="ghost" onPress={() => setConfirmRemove(true)} disabled={parts.length <= 3} />
              )
            ) : (
              <T size={14} color={colors.textSecondary}>
                Você é o organizador deste grupo.
              </T>
            )}
            {parts.length <= 3 && !selected.is_organizer ? (
              <T size={13} color={colors.textSecondary} align="center">
                O grupo precisa ter pelo menos 3 pessoas.
              </T>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      {/* Folha: adicionar pessoa */}
      <Sheet
        visible={adding}
        onClose={() => setAdding(false)}
        title="Adicionar pessoa"
        footer={<Button label="Adicionar e sortear para ela" onPress={doAdd} loading={busy} disabled={newName.trim().length < 2} />}
      >
        <View style={{ gap: 10 }}>
          <UnderlineInput value={newName} onChangeText={setNewName} placeholder="Nome e sobrenome" autoCapitalize="words" autoFocus onSubmitEditing={doAdd} />
          <T size={14} color={colors.textSecondary} lineHeight={20}>
            Só uma pessoa do grupo terá o resultado alterado, e ela verá o aviso ao abrir o link. Ninguém mais precisa fazer nada.
          </T>
        </View>
      </Sheet>
    </Screen>
  );
}
