import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

/** Abre uma URL externa (loja): nova aba no web, navegador in-app no nativo. */
export async function openExternal(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

/**
 * Abre a loja quando a URL só chega depois de uma chamada ao servidor.
 * No web, a aba é aberta já no toque (senão o Safari bloqueia como pop-up)
 * e recebe o endereço quando ele chegar.
 */
export async function openExternalAfter(getUrl: () => Promise<string>): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const tab = window.open('about:blank', '_blank');
    try {
      const url = await getUrl();
      if (tab && !tab.closed) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      tab?.close();
      throw e;
    }
    return;
  }
  await openExternal(await getUrl());
}
