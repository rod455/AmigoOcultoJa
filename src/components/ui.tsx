import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from './icons';
import { colors, fonts, layout } from '@/theme/tokens';

/* ---------------------------------------------------------------- */
/* Tipografia                                                        */
/* ---------------------------------------------------------------- */

type TProps = TextProps & { color?: string; size?: number; weight?: keyof typeof fonts; lineHeight?: number; align?: 'left' | 'center' | 'right' };

export function T({ color = colors.text, size = 16, weight = 'regular', lineHeight, align, style, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[
        { color, fontSize: size, fontFamily: fonts[weight], lineHeight: lineHeight ?? Math.round(size * 1.35), textAlign: align },
        style,
      ]}
    />
  );
}

export function Title({ children, size = 30, style, ...rest }: TProps & { children: React.ReactNode }) {
  return (
    <T
      {...rest}
      size={size}
      weight="extrabold"
      lineHeight={Math.round(size * 1.12)}
      style={[{ letterSpacing: size >= 36 ? -0.8 : -0.5 }, style]}
      accessibilityRole="header"
    >
      {children}
    </T>
  );
}

export function Sub({ children, style, ...rest }: TProps & { children: React.ReactNode }) {
  return (
    <T {...rest} size={18} color={colors.textSecondary} lineHeight={26} style={style}>
      {children}
    </T>
  );
}

export function Label({ children, style, ...rest }: TProps & { children: React.ReactNode }) {
  return (
    <T {...rest} size={14} weight="semibold" color={colors.textSecondary} style={style}>
      {children}
    </T>
  );
}

export function Overline({ children, style, ...rest }: TProps & { children: React.ReactNode }) {
  return (
    <T {...rest} size={14} weight="bold" color={colors.textSecondary} style={[{ textTransform: 'uppercase', letterSpacing: 0.2 }, style]}>
      {children}
    </T>
  );
}

/* ---------------------------------------------------------------- */
/* Tela                                                              */
/* ---------------------------------------------------------------- */

type ScreenProps = {
  children: React.ReactNode;
  /** rodapé fixo (botão principal) */
  footer?: React.ReactNode;
  scroll?: boolean;
  /** barra de topo: voltar + progresso */
  top?: React.ReactNode;
  padTop?: number;
  gap?: number;
  contentStyle?: ViewStyle;
  testID?: string;
};

/**
 * Container de tela: largura de celular no web (centralizado), safe areas no
 * nativo, conteúdo rolável e rodapé fixo.
 */
export function Screen({ children, footer, scroll = true, top, padTop = 20, gap = 0, contentStyle, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const body = (
    <View style={[{ flexGrow: 1, gap }, contentStyle]}>{children}</View>
  );
  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.phone, isWeb && styles.phoneWeb]}>
        <View style={{ height: isWeb ? padTop : insets.top + padTop }} />
        {top ? <View style={{ paddingHorizontal: layout.paddingX }}>{top}</View> : null}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: layout.paddingX, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: layout.paddingX }}>{body}</View>
        )}
        {footer ? (
          <View style={{ paddingHorizontal: layout.paddingX, paddingTop: 12, paddingBottom: isWeb ? 32 : Math.max(insets.bottom, 16) + 12 }}>
            {footer}
          </View>
        ) : (
          <View style={{ height: isWeb ? 32 : Math.max(insets.bottom, 16) }} />
        )}
      </View>
    </View>
  );
}

export function TopBar({ step, total, backTo }: { step?: number; total?: number; backTo?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: -12 }}>
      <BackButton to={backTo} />
      {step && total ? (
        <>
          <View style={{ flexGrow: 1, height: 4, borderRadius: 2, backgroundColor: colors.line }}>
            <View style={{ width: `${Math.round((step / total) * 100)}%`, height: 4, borderRadius: 2, backgroundColor: colors.text }} />
          </View>
          <T size={14} weight="semibold" color={colors.textSecondary} style={{ width: 32, textAlign: 'right' }}>
            {step}/{total}
          </T>
        </>
      ) : null}
    </View>
  );
}

export function BackButton({ to }: { to?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace((to ?? '/') as never);
      }}
      style={({ pressed }) => [{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 }]}
      hitSlop={6}
    >
      <ChevronLeft />
    </Pressable>
  );
}

/* ---------------------------------------------------------------- */
/* Botões                                                            */
/* ---------------------------------------------------------------- */

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'accent' | 'whatsapp' | 'ghost' | 'outline';
  loading?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export function Button({ label, variant = 'primary', loading, icon, disabled, style, ...rest }: ButtonProps) {
  const bg =
    variant === 'primary' ? colors.text : variant === 'accent' ? colors.accent : variant === 'whatsapp' ? colors.whatsapp : 'transparent';
  const fg = variant === 'ghost' || variant === 'outline' ? colors.text : '#FFFFFF';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isDisabled && variant !== 'ghost' && variant !== 'outline' ? colors.disabled : bg },
        variant === 'ghost' && { height: 52 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.lineStrong },
        (pressed) && !isDisabled && { opacity: 0.88 },
        typeof style === 'function' ? undefined : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {icon}
          <T size={variant === 'ghost' ? 16 : 17} weight={variant === 'ghost' ? 'semibold' : 'bold'} color={fg}>
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

export function Pill({
  label,
  onPress,
  variant = 'accent',
  small,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'accent' | 'outline' | 'dark';
  small?: boolean;
}) {
  const filled = variant === 'accent' || variant === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 40,
          paddingHorizontal: small ? 14 : 16,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'accent' ? colors.accent : variant === 'dark' ? colors.text : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.accent,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <T size={14} weight="bold" color={filled ? '#FFFFFF' : colors.accentDark}>
        {label}
      </T>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- */
/* Linhas e inputs                                                   */
/* ---------------------------------------------------------------- */

export function Row({ children, height = layout.rowHeight, style, ...rest }: ViewProps & { children: React.ReactNode; height?: number }) {
  return (
    <View
      {...rest}
      style={[{ flexDirection: 'row', alignItems: 'center', minHeight: height, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 }, style]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 8, backgroundColor: colors.surfaceAlt, marginHorizontal: -layout.paddingX }} />;
}

export function UnderlineInput(props: TextInputProps & { big?: boolean; ref?: React.Ref<TextInput> }) {
  const { big, style, ref, ...rest } = props;
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textMuted}
      {...rest}
      style={[
        {
          height: big ? 56 : 52,
          borderBottomWidth: 2,
          borderBottomColor: colors.text,
          fontSize: big ? 24 : 18,
          fontFamily: big ? fonts.semibold : fonts.regular,
          color: colors.text,
          paddingVertical: 0,
          paddingHorizontal: 0,
        },
        Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as ViewStyle),
        style,
      ]}
    />
  );
}

export function IconButton({ children, label, onPress, size = 44, bg, border }: { children: React.ReactNode; label: string; onPress?: () => void; size?: number; bg?: string; border?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg ?? 'transparent',
          borderWidth: border ? 1.5 : 0,
          borderColor: colors.lineStrong,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <T size={14} color={colors.accentDark} accessibilityLiveRegion="polite">
      {children}
    </T>
  );
}

export function Loading() {
  return (
    <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <T size={size} weight="extrabold" style={{ letterSpacing: -0.3 }}>
      Tirei!
    </T>
  );
}

/** Marca: dois quadrados inclinados com "?" (tela 1) */
export function Mark({ scale = 1 }: { scale?: number }) {
  const s = 76 * scale;
  return (
    <View style={{ position: 'relative', width: 110 * scale, height: 100 * scale }}>
      <View style={{ position: 'absolute', left: 0, top: 10 * scale, width: s, height: s, borderRadius: 20 * scale, backgroundColor: colors.text, transform: [{ rotate: '-8deg' }] }} />
      <View
        style={{
          position: 'absolute',
          left: 34 * scale,
          top: 4 * scale,
          width: s,
          height: s,
          borderRadius: 20 * scale,
          backgroundColor: colors.accent,
          transform: [{ rotate: '7deg' }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <T size={40 * scale} weight="extrabold" color="#FFFFFF" lineHeight={44 * scale}>
          ?
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Platform.OS === 'web' ? colors.surfaceAlt : colors.surface, alignItems: 'center' },
  phone: { flex: 1, width: '100%', backgroundColor: colors.surface },
  phoneWeb: { maxWidth: layout.phoneWidth, minHeight: '100%' as unknown as number },
  button: {
    height: layout.buttonHeight,
    borderRadius: layout.buttonHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
