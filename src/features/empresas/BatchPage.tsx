import * as Clipboard from 'expo-clipboard';
import { Link, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { Copy, WhatsApp } from '@/components/icons';
import { Button, Loading, T } from '@/components/ui';
import { BrandEditor } from '@/features/brand/BrandEditor';
import { GroupBrandHeader, GroupBrandProvider } from '@/features/brand/GroupBrand';
import { CompanyShell } from '@/features/empresas/CompanyShell';
import { saveCsv } from '@/features/empresas/files';
import { track } from '@/lib/analytics';
import { type BatchGroup, type BatchPanel, friendlyError, getBatchPanel, setPersonalInvites } from '@/lib/api';
import { downloadPersonalLinks } from '@/features/invites/PersonalInvitesSheet';
import { getSession } from '@/lib/auth';
import { parseBrand } from '@/lib/brand';
import { groupMeta } from '@/lib/format';
import { inviteMessage, inviteUrl, openWhatsApp, personalInviteUrl } from '@/lib/share';
import { useViewportWidth } from '@/lib/useViewportWidth';
import { biz, colors } from '@/theme/tokens';

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

function Bar({ value }: { value: number }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${value}%`, height: '100%', backgroundColor: biz.accent }} />
    </View>
  );
}

/** Planilha com os links de cada grupo (Grupo; Link; Pessoas; Já viram), separador ";" como o Excel em português. No app, vai pela folha de compartilhar. */
async function downloadLinks(panel: BatchPanel): Promise<void> {
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [['Grupo', 'Link', 'Pessoas', 'Já viram quem tiraram', 'Listas prontas'], ...panel.groups.map((g) => [g.name, inviteUrl(g.code), g.total, g.viewed, g.list_ready])];
  const csv = '﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n');
  await saveCsv(csv, `links-${slug(panel.batch.name)}.csv`);
}

const slug = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();

function GroupRow({ g, wide, onCopied }: { g: BatchGroup; wide: boolean; onCopied: (name: string) => void }) {
  const copy = async () => {
    await Clipboard.setStringAsync(inviteUrl(g.code));
    track('link_copied', { origem: 'lote' }, { code: g.code });
    onCopied(g.name);
  };
  const native = Platform.OS !== 'web';
  // no app: folha de compartilhar do sistema (WhatsApp, Slack, Teams, e-mail); no site: WhatsApp direto
  const share = async () => {
    const message = inviteMessage({ groupName: g.name, code: g.code, budgetCents: g.budget_cents, exchangeAt: g.exchange_at });
    if (native) {
      track('link_copied', { origem: 'lote', via: 'compartilhar' }, { code: g.code });
      await Share.share({ message }).catch(() => undefined);
      return;
    }
    track('share_whatsapp_clicked', { origem: 'lote' }, { code: g.code });
    await openWhatsApp(message);
  };
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', gap: wide ? 20 : 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ flex: 1, gap: 4 }}>
        <T size={17} weight="bold">
          {g.name}
        </T>
        <T size={13} color={colors.textSecondary}>
          {g.total} pessoas · {g.opened} abriram · {g.viewed} viram · {g.list_ready} com lista{g.received ? ` · ${g.received} receberam` : ''}
        </T>
        <View style={{ maxWidth: 360, paddingTop: 4 }}>
          <Bar value={pct(g.viewed, g.total)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Copiar link de ${g.name}`} onPress={copy} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.lineStrong, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Copy size={15} />
          <T size={14} weight="bold">
            Copiar link
          </T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={native ? `Enviar o link de ${g.name}` : `Enviar ${g.name} no WhatsApp`} onPress={share} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: native ? biz.accent : colors.whatsapp, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {native ? null : <WhatsApp size={16} />}
          <T size={14} weight="bold" color="#FFFFFF">
            {native ? 'Enviar' : 'WhatsApp'}
          </T>
        </Pressable>
        <Link href={{ pathname: '/painel/[codigo]', params: { codigo: g.code } }} asChild>
          <Pressable accessibilityRole="link" style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center' }}>
            <T size={14} weight="bold" color={biz.accentDark} style={{ textDecorationLine: 'underline' }}>
              Painel do grupo
            </T>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

/**
 * "/empresas/lote/[id]": painel do RH com todos os grupos da importação.
 * Andamento geral e por área, links (copiar, WhatsApp, baixar planilha com
 * todos) e a marca da empresa aplicada a todos os grupos de uma vez.
 */
export function BatchPage({ id }: { id: string }) {
  const width = useViewportWidth();
  const wide = width >= 860;
  const [panel, setPanel] = useState<BatchPanel | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [branding, setBranding] = useState(false);
  const [personalBusy, setPersonalBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    getBatchPanel(id)
      .then((p) => {
        setPanel(p);
        setError('');
      })
      .catch((e) => setError(friendlyError(e)));
  }, [id]);

  useEffect(() => {
    let alive = true;
    getSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace({ pathname: '/conta', params: { mode: 'login', next: `/empresas/lote/${id}` } });
        return;
      }
      load();
    });
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, load]);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(''), 2500);
  };

  const copyAll = async () => {
    if (!panel) return;
    const text = panel.groups.map((g) => `${g.name}: ${inviteUrl(g.code)}`).join('\n');
    await Clipboard.setStringAsync(text);
    track('link_copied', { origem: 'lote_todos', grupos: panel.groups.length });
    flash('Todos os links copiados, um por linha.');
  };

  /** Liga o convite individual em todos os grupos e baixa uma planilha com o link de cada pessoa. */
  const personalLinks = async () => {
    if (!panel) return;
    const rows: Array<{ name: string; group: string; url: string }> = [];
    try {
      for (let i = 0; i < panel.groups.length; i++) {
        const g = panel.groups[i];
        setPersonalBusy(`Gerando links: ${i + 1} de ${panel.groups.length} grupos`);
        const r = await setPersonalInvites(g.code, true);
        r.people.forEach((p) => p.token && rows.push({ name: p.display_name, group: g.name, url: personalInviteUrl(g.code, p.token) }));
      }
      track('personal_invites_set', { ligado: true, pessoas: rows.length, lote: true });
      await downloadPersonalLinks(rows, `links-individuais-${slug(panel.batch.name)}.csv`);
      flash(`Convite individual ligado em todos os grupos. Planilha com ${rows.length} links ${Platform.OS === 'web' ? 'baixada' : 'pronta'}.`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPersonalBusy(null);
    }
  };

  const groups = panel?.groups ?? [];
  const total = groups.reduce((s, g) => s + g.total, 0);
  const viewed = groups.reduce((s, g) => s + g.viewed, 0);
  const lists = groups.reduce((s, g) => s + g.list_ready, 0);
  const brandRaw = groups.find((g) => g.brand)?.brand ?? null;
  const brand = parseBrand(brandRaw);
  const first = groups[0];

  return (
    <CompanyShell title={panel ? `${panel.batch.name} · Amigo Oculto Já! Empresas` : 'Grupos da empresa · Amigo Oculto Já!'} navOrigin="lote_nav" backTo="/">
          {!panel ? (
            <View style={{ paddingVertical: 60, gap: 12 }}>{error ? <T size={16} color={colors.accentDark}>{error}</T> : <Loading />}</View>
          ) : (
            <GroupBrandProvider brand={brandRaw}>
              <View style={{ gap: 24, paddingTop: wide ? 16 : 4, paddingBottom: 24 }}>
                {brand ? <View style={{ maxWidth: 520 }}><GroupBrandHeader /></View> : null}
                <View style={{ gap: 8 }}>
                  <T size={13} weight="bold" color={biz.accentDark} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Painel da empresa · {groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}
                  </T>
                  <T size={wide ? 38 : 28} weight="extrabold" lineHeight={wide ? 43 : 33} style={{ letterSpacing: -0.8 }} accessibilityRole="header">
                    {panel.batch.name}
                  </T>
                  {first ? (
                    <T size={15} color={colors.textSecondary}>
                      {groupMeta(first.budget_cents, first.exchange_at)}
                    </T>
                  ) : null}
                </View>

                <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
                  {[
                    [`${viewed} de ${total}`, 'já viram quem tiraram', pct(viewed, total)],
                    [`${lists}`, 'já montaram a lista de presentes', pct(lists, total)],
                  ].map(([big, label, v]) => (
                    <View key={String(label)} style={{ flex: 1, padding: 20, borderRadius: 20, backgroundColor: biz.tintSoft, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <T size={40} weight="extrabold" lineHeight={44} style={{ letterSpacing: -1 }}>
                          {big}
                        </T>
                        <T size={15} color={colors.textSecondary}>
                          {label}
                        </T>
                      </View>
                      <Bar value={Number(v)} />
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <Button label="Copiar todos os links" variant="biz" onPress={copyAll} style={{ width: 'auto', paddingHorizontal: 22, height: 48 }} />
                  <Button label={Platform.OS === 'web' ? 'Baixar planilha com os links' : 'Enviar planilha com os links'} variant="outline" onPress={() => { downloadLinks(panel).catch(() => setError('Não deu para gerar a planilha agora. Tente de novo.')); track('link_copied', { origem: 'lote_planilha', grupos: groups.length }); }} style={{ width: 'auto', paddingHorizontal: 20, height: 48 }} />
                  <Button label="Links individuais (planilha)" variant="outline" onPress={personalLinks} loading={!!personalBusy} style={{ width: 'auto', paddingHorizontal: 20, height: 48 }} />
                  <Button label={brand ? 'Trocar a marca da empresa' : 'Colocar a marca da empresa'} variant="outline" onPress={() => setBranding(true)} disabled={!first} style={{ width: 'auto', paddingHorizontal: 20, height: 48 }} />
                </View>
                {personalBusy ? (
                  <T size={14} color={colors.textSecondary}>
                    {personalBusy}
                  </T>
                ) : null}
                {notice ? (
                  <T size={14} color={colors.successText}>
                    {notice}
                  </T>
                ) : null}
                {error && panel ? (
                  <T size={14} color={colors.accentDark}>
                    {error}
                  </T>
                ) : null}
                <T size={14} color={colors.textSecondary} lineHeight={20}>
                  Mande o link de cada grupo no canal do time correspondente. Quem participa toca no próprio nome e descobre quem tirou. O andamento aqui se atualiza sozinho.
                </T>

                <View>
                  {groups.map((g) => (
                    <GroupRow key={g.id} g={g} wide={wide} onCopied={(n) => flash(`Link de ${n} copiado.`)} />
                  ))}
                </View>

                <Link href="/empresas/importar" asChild>
                  <Pressable accessibilityRole="link" style={{ alignSelf: 'flex-start' }}>
                    <T size={15} weight="semibold" color={biz.accentDark} style={{ textDecorationLine: 'underline' }}>
                      Importar outra planilha
                    </T>
                  </Pressable>
                </Link>
              </View>
              {first ? (
                <BrandEditor target={{ kind: 'batch', batchId: id }} logoFolder={first.id} shared current={brandRaw} visible={branding} onClose={() => setBranding(false)} onSaved={load} />
              ) : null}
            </GroupBrandProvider>
          )}
    </CompanyShell>
  );
}
