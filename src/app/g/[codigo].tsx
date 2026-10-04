import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ParticipantFlow } from '@/features/participant/ParticipantFlow';

/** Link do convite: /g/{codigo} — telas 7, 8 e 9 */
export default function GroupLink() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  return <ParticipantFlow code={String(codigo ?? '').toUpperCase()} />;
}
