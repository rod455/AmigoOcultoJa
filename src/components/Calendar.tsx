import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from './icons';
import { T } from './ui';
import { colors } from '@/theme/tokens';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayIso(): string {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
}

/**
 * Calendário mensal simples (sem dependências), com toque em um dia.
 * Datas anteriores a hoje ficam desabilitadas.
 */
export function Calendar({ value, onChange, minIso }: { value: string | null; onChange: (iso: string) => void; minIso?: string }) {
  const today = todayIso();
  const min = minIso ?? today;
  const start = value ?? today;
  const [y0, m0] = start.split('-').map(Number);
  const [cursor, setCursor] = useState({ y: y0, m: m0 - 1 });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const lead = first.getDay();
    const out: Array<number | null> = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const prev = () => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const next = () => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));
  const canPrev = iso(cursor.y, cursor.m, 1) > min.slice(0, 8) + '01';

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={prev} disabled={!canPrev} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canPrev ? 1 : 0.3 }}>
          <ChevronLeft />
        </Pressable>
        <T size={17} weight="bold" accessibilityLiveRegion="polite">
          {MONTHS[cursor.m]} de {cursor.y}
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={next} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w, i) => (
          <T key={i} size={12} weight="bold" color={colors.textSecondary} align="center" style={{ flex: 1 }}>
            {w}
          </T>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {cells.slice(row * 7, row * 7 + 7).map((d, i) => {
            if (d == null) return <View key={i} style={{ flex: 1, height: 44 }} />;
            const dayIso = iso(cursor.y, cursor.m, d);
            const selected = dayIso === value;
            const disabled = dayIso < min;
            const isToday = dayIso === today;
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${d} de ${MONTHS[cursor.m]}`}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onChange(dayIso)}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.text : pressed ? colors.surfaceAlt : 'transparent',
                    borderWidth: isToday && !selected ? 1.5 : 0,
                    borderColor: colors.lineStrong,
                  })}
                >
                  <T size={16} weight={selected || isToday ? 'bold' : 'regular'} color={selected ? '#FFFFFF' : disabled ? colors.textMuted : colors.text}>
                    {d}
                  </T>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
