// Sistema visual v2 (spec §13)
export const colors = {
  text: '#111418',
  textSecondary: '#5F6670',
  textMuted: '#8A9099',
  line: '#EAECEF',
  lineStrong: '#DADDE1',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F5F6',
  accent: '#C63D24',
  accentDark: '#A8321C',
  whatsapp: '#0E7A5F',
  successBg: '#DDEFE6',
  successText: '#0B5E48',
  warningText: '#8A4B0F',
  disabled: '#8A9099',
  hover: '#3A3F47',
} as const;

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

export const layout = {
  /** largura máxima do conteúdo (web): mesma largura do protótipo */
  phoneWidth: 430,
  paddingX: 24,
  buttonHeight: 58,
  rowHeight: 52,
  touchTarget: 44,
} as const;

export const tints = ['#F6E3DC', '#EFE0EA', '#E3E9F6', '#E2F0EA', '#F3EEDC', '#ECE8F5'] as const;
