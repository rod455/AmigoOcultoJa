import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { AccentProvider, BrandSymbol, T } from '@/components/ui';
import { accentFrom, brandLogoUrl, type GroupBrand, parseBrand } from '@/lib/brand';
import { supabaseUrl } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

type BrandInfo = { brand: GroupBrand | null; logoUrl: string | null };

const BrandContext = createContext<BrandInfo>({ brand: null, logoUrl: null });

export function useGroupBrand(): BrandInfo {
  return useContext(BrandContext);
}

/**
 * Aplica a marca da empresa (logo e cores) a tudo que está dentro: botões e
 * destaques usam a cor dela (useAccent) e GroupBrandHeader mostra o logo.
 * Sem marca, nada muda.
 */
export function GroupBrandProvider({ brand: raw, children }: { brand: unknown; children: React.ReactNode }) {
  const brand = useMemo(() => parseBrand(raw), [raw]);
  const accent = useMemo(() => accentFrom(brand), [brand]);
  const info = useMemo<BrandInfo>(
    () => ({ brand, logoUrl: brand?.logo && supabaseUrl ? brandLogoUrl(supabaseUrl, brand.logo) : null }),
    [brand],
  );
  return (
    <BrandContext.Provider value={info}>
      <AccentProvider value={accent}>{children}</AccentProvider>
    </BrandContext.Provider>
  );
}

/** Logo da empresa com a proporção do próprio arquivo (até `maxWidth`). */
export function BrandLogo({ uri, height = 40, maxWidth = 160 }: { uri: string; height?: number; maxWidth?: number }) {
  const [ratio, setRatio] = useState(1);
  useEffect(() => {
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => alive && h > 0 && setRatio(w / h),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [uri]);
  const width = Math.min(maxWidth, Math.round(height * ratio));
  const h = Math.round(width / ratio);
  return <Image source={{ uri }} style={{ width, height: h }} resizeMode="contain" accessibilityRole="image" accessibilityLabel="Logo da empresa" />;
}

/**
 * Faixa no topo das telas do grupo: logo e nome da empresa sobre o fundo de
 * apoio da marca. Sem marca, não aparece.
 */
export function GroupBrandHeader() {
  const { brand, logoUrl } = useGroupBrand();
  const tint = accentFrom(brand).tint;
  if (!brand || (!logoUrl && !brand.name)) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: tint }}>
      {logoUrl ? (
        <View style={{ padding: 6, borderRadius: 12, backgroundColor: '#FFFFFF' }}>
          <BrandLogo uri={logoUrl} height={36} maxWidth={140} />
        </View>
      ) : null}
      {brand.name ? (
        <T size={17} weight="extrabold" style={{ flexShrink: 1, letterSpacing: -0.2 }} numberOfLines={2}>
          {brand.name}
        </T>
      ) : null}
    </View>
  );
}

/** Crédito discreto no pé das telas com marca: o sorteio continua sendo do Amigo Oculto Já!. */
export function PoweredBy() {
  const { brand } = useGroupBrand();
  if (!brand) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4 }}>
      <BrandSymbol size={16} />
      <T size={12} color={colors.textMuted}>
        Sorteio feito com Amigo Oculto Já!
      </T>
    </View>
  );
}
