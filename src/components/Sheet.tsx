import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from './ui';
import { colors, layout } from '@/theme/tokens';

/**
 * Folha inferior simples (bottom sheet). Usada para data da troca, pares
 * proibidos e ações do painel. Uma ação principal por folha.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdropWrap}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Platform.OS === 'web' ? 24 : Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.handle} />
          {title ? (
            <T size={22} weight="extrabold" style={{ letterSpacing: -0.3, paddingBottom: 12 }}>
              {title}
            </T>
          ) : null}
          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingTop: 16 }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,20,24,0.45)' },
  sheet: {
    width: '100%',
    maxWidth: layout.phoneWidth,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: layout.paddingX,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 },
});
