import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { T } from '@/components/ui';
import { tagEnabled } from '@/lib/marketing-config';
import { setConsent, storedConsent } from '@/lib/marketing';
import { colors } from '@/theme/tokens';

/**
 * Aviso de cookies (Consent Mode v2). Só no site e só quando a tag do Google
 * está ligada. Até a pessoa aceitar, o Google fica com tudo negado.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  // depois de montar: o HTML estático não sabe a escolha guardada no navegador
  useEffect(() => {
    if (Platform.OS === 'web' && tagEnabled && storedConsent() === null) setOpen(true);
  }, []);

  if (!open) return null;
  const choose = (c: 'granted' | 'denied') => {
    setConsent(c);
    setOpen(false);
  };
  return (
    <View
      accessibilityRole="alert"
      style={{ position: 'fixed' as 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1000, alignItems: 'center' }}
    >
      <View style={{ width: '100%', maxWidth: 560, padding: 16, borderRadius: 16, backgroundColor: colors.text, gap: 12 }}>
        <T size={14} color="#FFFFFF" lineHeight={20}>
          Usamos cookies do Google para medir as visitas e os anúncios. Você escolhe. Veja a{' '}
          <Link href="/privacidade">
            <T size={14} color="#FFFFFF" style={{ textDecorationLine: 'underline' }}>
              Política de Privacidade
            </T>
          </Link>
          .
        </T>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
          <Pressable accessibilityRole="button" onPress={() => choose('denied')} style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: '#FFFFFF66', justifyContent: 'center' }}>
            <T size={14} weight="bold" color="#FFFFFF">
              Recusar
            </T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => choose('granted')} style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center' }}>
            <T size={14} weight="bold">
              Aceitar
            </T>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
