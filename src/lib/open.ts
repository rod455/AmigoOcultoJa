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
