import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

/**
 * Banner do AdMob no app. Só aparece quando o AdMob está na build
 * (native-services.js) e há um bloco de anúncio para a plataforma em
 * EXPO_PUBLIC_ADMOB_BANNER_IOS / EXPO_PUBLIC_ADMOB_BANNER_ANDROID. Anúncios
 * sempre não personalizados: o app não pede o identificador de publicidade
 * (nem mostra o aviso de rastreamento do iPhone).
 */
const UNIT = Platform.select({ ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS, android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID }) ?? '';

type Ads = {
  default: () => { initialize: () => Promise<unknown> };
  BannerAd: React.ComponentType<{ unitId: string; size: string; requestOptions?: Record<string, unknown>; onAdFailedToLoad?: () => void }>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
};
let ads: Ads | null | undefined;
let started: Promise<unknown> | null = null;

function loadAds(): Ads | null {
  if (ads !== undefined) return ads;
  try {
    ads = require('react-native-google-mobile-ads') as Ads;
    started ??= ads.default().initialize().catch(() => undefined);
  } catch {
    ads = null;
  }
  return ads;
}

export function AdBanner({ placement }: { placement: string }) {
  const [failed, setFailed] = useState(false);
  const [lib, setLib] = useState<Ads | null>(null);
  useEffect(() => {
    if (UNIT) setLib(loadAds());
  }, []);
  if (!UNIT || !lib || failed) return null;
  const { BannerAd, BannerAdSize } = lib;
  return (
    <View accessibilityLabel="Anúncio" testID={`anuncio-${placement}`} style={{ alignItems: 'center', paddingVertical: 8 }}>
      <BannerAd unitId={UNIT} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} onAdFailedToLoad={() => setFailed(true)} />
    </View>
  );
}
