import Head from 'expo-router/head';
import React from 'react';

/**
 * Páginas privadas (convite, painel, conta, criação): buscadores não devem
 * indexar. Nomes de grupos e participantes nunca podem aparecer no Google.
 */
export function NoIndex() {
  return (
    <Head>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
  );
}
