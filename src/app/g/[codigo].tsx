import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import React from 'react';
import { ParticipantFlow } from '@/features/participant/ParticipantFlow';

/** Link do convite: /g/{codigo} — telas 7, 8 e 9 */
export default function GroupLink() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  return (
    <>
      {/* prévia do link no WhatsApp: convite genérico (nunca nomes do grupo) */}
      <Head>
        <title>Você está no amigo oculto! · Amigo Oculto Já!</title>
        <meta property="og:title" content="Você está no amigo oculto!" />
        <meta property="og:description" content="Toque no link, escolha seu nome e descubra quem você tirou. Depois é só montar sua lista de presentes." />
        <meta name="description" content="Toque no link, escolha seu nome e descubra quem você tirou." />
      </Head>
      <ParticipantFlow code={String(codigo ?? '').toUpperCase()} />
    </>
  );
}
