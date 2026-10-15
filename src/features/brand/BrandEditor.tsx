import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Check } from '@/components/icons';
import { Sheet } from '@/components/Sheet';
import { Button, ErrorText, T, UnderlineInput } from '@/components/ui';
import { BrandLogo, GroupBrandHeader, GroupBrandProvider } from '@/features/brand/GroupBrand';
import { track } from '@/lib/analytics';
import { friendlyError, removeGroupLogo, setBatchBrand, setGroupBrand, uploadGroupLogo } from '@/lib/api';
import { accentFrom, brandLogoUrl, contrast, dominantColor, type GroupBrand, normalizeHex, parseBrand } from '@/lib/brand';
import { supabaseUrl } from '@/lib/supabase';
import { colors, fonts } from '@/theme/tokens';

/** Cores prontas para quem não sabe o código da cor da empresa. */
const PRESETS = ['#1F4BB8', '#0E7A5F', '#6D28D9', '#DB2777', '#EA580C', '#E30613', '#0F766E', '#111418'];

type Prepared = { blob: Blob; ext: 'webp' | 'png'; suggested: string | null };

/**
 * Web: reduz o logo para no máximo 512 px (fica leve para quem abre o link no
 * celular), converte para WebP (ou PNG, se o navegador não souber) e sugere a
 * cor principal a partir dos pixels.
 */
async function prepareLogo(file: File): Promise<Prepared> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('FORMATO');
  if (file.size > 8 * 1024 * 1024) throw new Error('GRANDE');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = document.createElement('img');
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS');
    ctx.drawImage(img, 0, 0, w, h);

    // cor sugerida: amostra pequena basta
    const sample = document.createElement('canvas');
    const sw = Math.min(96, w);
    const sh = Math.max(1, Math.round((sw / w) * h));
    sample.width = sw;
    sample.height = sh;
    const sctx = sample.getContext('2d');
    sctx?.drawImage(img, 0, 0, sw, sh);
    const suggested = sctx ? dominantColor(sctx.getImageData(0, 0, sw, sh).data) : null;

    const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    let blob = await toBlob('image/webp');
    let ext: 'webp' | 'png' = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob('image/png');
      ext = 'png';
    }
    if (!blob) throw new Error('CANVAS');
    if (blob.size > 500 * 1024) throw new Error('GRANDE');
    return { blob, ext, suggested };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function Swatch({ color, on, onPress, label }: { color: string; on: boolean; onPress: () => void; label: string }) {
  const light = contrast(color, '#FFFFFF') < 1.6;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 3 : light ? 1 : 0, borderColor: on ? colors.text : colors.lineStrong }}
    >
      {on ? <Check size={16} color={contrast(color, '#FFFFFF') >= 3 ? '#FFFFFF' : colors.text} /> : null}
    </Pressable>
  );
}

function ColorField({
  title,
  value,
  onChange,
  suggested,
  optional,
}: {
  title: string;
  value: string | null;
  onChange: (v: string | null) => void;
  suggested: string | null;
  optional?: boolean;
}) {
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);
  const options = Array.from(new Set([...(suggested ? [suggested] : []), ...PRESETS]));
  return (
    <View style={{ gap: 10 }}>
      <T size={14} weight="semibold" color={colors.textSecondary}>
        {title}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
        {optional ? (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: !value }}
            accessibilityLabel="Sem cor secundária"
            onPress={() => onChange(null)}
            style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: !value ? 3 : 1, borderColor: !value ? colors.text : colors.lineStrong, justifyContent: 'center' }}
          >
            <T size={13} weight="semibold">
              Nenhuma
            </T>
          </Pressable>
        ) : null}
        {options.map((c) => (
          <Swatch key={c} color={c} on={value === c} onPress={() => onChange(c)} label={c === suggested ? `Cor do logo ${c}` : `Cor ${c}`} />
        ))}
      </View>
      {suggested ? (
        <T size={12} color={colors.textSecondary}>
          A primeira bolinha é a cor encontrada no seu logo.
        </T>
      ) : null}
      <UnderlineInput
        value={text}
        onChangeText={(v) => {
          setText(v);
          const n = normalizeHex(v);
          if (n) onChange(n);
        }}
        placeholder="#1F4BB8"
        autoCapitalize="characters"
        maxLength={7}
        accessibilityLabel={`${title}, código da cor`}
        style={{ fontFamily: fonts.semibold, fontSize: 17, height: 44 }}
      />
    </View>
  );
}

/** Prévia com a marca: o topo e o botão como os participantes vão ver. */
function Preview({ brand }: { brand: GroupBrand }) {
  const a = accentFrom(brand);
  return (
    <GroupBrandProvider brand={brand}>
      <View style={{ gap: 12, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.line }}>
        <T size={12} weight="bold" color={colors.textSecondary} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Prévia do que o grupo vê
        </T>
        <GroupBrandHeader />
        <View style={{ gap: 2 }}>
          <T size={14} color={colors.textSecondary}>
            Ana, você tirou
          </T>
          <T size={26} weight="extrabold" style={{ letterSpacing: -0.6 }}>
            Diego Rocha
          </T>
        </View>
        <View style={{ height: 48, borderRadius: 24, backgroundColor: a.accent, alignItems: 'center', justifyContent: 'center' }}>
          <T size={15} weight="bold" color={a.onAccent}>
            Pronto, salvar (1 de 3)
          </T>
        </View>
      </View>
    </GroupBrandProvider>
  );
}

/** Onde a marca é gravada: num grupo (painel do grupo) ou em todos os grupos de um lote (painel do RH). */
export type BrandTarget = { kind: 'group'; code: string } | { kind: 'batch'; batchId: string };

/**
 * Folha "Marca da empresa": logo, nome e cores. O que é salvo vale para todas
 * as telas do grupo (quem é você, você tirou, lista e painel), ou de todos os
 * grupos do lote. `logoFolder` é o id do grupo em cuja pasta o logo é enviado;
 * `shared` = o logo atual pode estar em uso por outros grupos (lote), então
 * não é apagado ao trocar.
 */
export function BrandEditor({
  target,
  logoFolder,
  shared = false,
  current: rawCurrent,
  visible,
  onClose,
  onSaved,
}: {
  target: BrandTarget;
  logoFolder: string;
  shared?: boolean;
  current: unknown;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const code = target.kind === 'group' ? target.code : undefined;
  const persist = (b: { name?: string; logo?: string; primary: string; secondary?: string } | null) =>
    target.kind === 'group' ? setGroupBrand(target.code, b) : setBatchBrand(target.batchId, b);
  const current = parseBrand(rawCurrent);
  const [name, setName] = useState(current?.name ?? '');
  const [logo, setLogo] = useState<string | null>(current?.logo ?? null);
  const [primary, setPrimary] = useState<string | null>(current?.primary ?? null);
  const [secondary, setSecondary] = useState<string | null>(current?.secondary ?? null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // logos enviados nesta abertura e não salvos: apagados ao fechar sem salvar
  const orphans = useRef<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    const c = parseBrand(rawCurrent);
    setName(c?.name ?? '');
    setLogo(c?.logo ?? null);
    setPrimary(c?.primary ?? null);
    setSecondary(c?.secondary ?? null);
    setSuggested(null);
    setError('');
    orphans.current = [];
  }, [visible, rawCurrent]);

  const close = () => {
    orphans.current.forEach((p) => void removeGroupLogo(p));
    orphans.current = [];
    onClose();
  };

  const chooseLogo = async () => {
    setError('');
    const file = await pickFile();
    if (!file) return;
    setUploading(true);
    try {
      const prepared = await prepareLogo(file);
      const path = await uploadGroupLogo(logoFolder, prepared.blob, prepared.ext);
      orphans.current.push(path);
      setLogo(path);
      setSuggested(prepared.suggested);
      // primeira vez: já usa a cor do logo
      if (prepared.suggested && !primary) setPrimary(prepared.suggested);
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setError(m === 'FORMATO' ? 'Envie o logo em PNG, JPG ou WebP.' : m === 'GRANDE' ? 'Esse arquivo é grande demais. Tente uma versão menor do logo.' : friendlyError(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!primary) {
      setError('Escolha a cor principal da empresa.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await persist({ name: name.trim() || undefined, logo: logo ?? undefined, primary, secondary: secondary ?? undefined });
      track('group_branded', { logo: !!logo, nome: !!name.trim(), secundaria: !!secondary, lote: target.kind === 'batch' }, { code });
      // o logo salvo deixa de ser órfão; os outros enviados agora e o antigo saem
      orphans.current.filter((p) => p !== logo).forEach((p) => void removeGroupLogo(p));
      if (!shared && current?.logo && current.logo !== logo) void removeGroupLogo(current.logo);
      orphans.current = [];
      onSaved();
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setError('');
    try {
      await persist(null);
      track('group_branded', { removida: true, lote: target.kind === 'batch' }, { code });
      orphans.current.forEach((p) => void removeGroupLogo(p));
      if (!shared && current?.logo) void removeGroupLogo(current.logo);
      orphans.current = [];
      onSaved();
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const draft: GroupBrand | null = primary ? { primary, secondary: secondary ?? undefined, name: name.trim() || undefined, logo: logo ?? undefined } : null;
  const logoUrl = logo && supabaseUrl ? brandLogoUrl(supabaseUrl, logo) : null;

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Marca da empresa"
      footer={
        <View style={{ gap: 6 }}>
          <ErrorText>{error}</ErrorText>
          <Button label="Salvar marca" variant="dark" onPress={save} loading={saving} disabled={!primary || uploading} />
          {current ? <Button label="Voltar ao visual padrão" variant="ghost" onPress={reset} disabled={saving} /> : null}
        </View>
      }
    >
      <View style={{ gap: 22 }}>
        <T size={15} color={colors.textSecondary} lineHeight={21}>
          {target.kind === 'batch'
            ? 'O logo e as cores valem para todos os grupos desta importação: na escolha do nome, no "você tirou", na lista de presentes e nos painéis.'
            : 'O logo e as cores aparecem para todo mundo do grupo: na escolha do nome, no "você tirou", na lista de presentes e neste painel.'}
        </T>

        {/* logo */}
        <View style={{ gap: 10 }}>
          <T size={14} weight="semibold" color={colors.textSecondary}>
            Logo
          </T>
          {logoUrl ? (
            <View style={{ alignSelf: 'flex-start', padding: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
              <BrandLogo uri={logoUrl} height={48} maxWidth={200} />
            </View>
          ) : null}
          {Platform.OS === 'web' ? (
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Button label={logo ? 'Trocar logo' : 'Enviar logo'} variant="outline" onPress={chooseLogo} loading={uploading} style={{ width: 'auto', paddingHorizontal: 22, height: 48 }} />
              {logo ? <Button label="Tirar logo" variant="ghost" onPress={() => setLogo(null)} style={{ width: 'auto', paddingHorizontal: 16, height: 48 }} /> : null}
            </View>
          ) : (
            <T size={14} color={colors.textSecondary} lineHeight={20}>
              Para enviar o logo, abra este painel no computador, em amigoocultoja.com.br, com a mesma conta. As cores dá para escolher aqui.
            </T>
          )}
          <T size={12} color={colors.textSecondary}>
            PNG, JPG ou WebP. Fundo transparente fica melhor.
          </T>
        </View>

        <UnderlineInput value={name} onChangeText={setName} placeholder="Nome da empresa (opcional)" maxLength={60} accessibilityLabel="Nome da empresa" />

        <ColorField title="Cor principal (botões e destaques)" value={primary} onChange={(v) => v && setPrimary(v)} suggested={suggested} />
        <ColorField title="Cor secundária (fundo da faixa do logo)" value={secondary} onChange={setSecondary} suggested={null} optional />

        {draft ? <Preview brand={draft} /> : null}
      </View>
    </Sheet>
  );
}
