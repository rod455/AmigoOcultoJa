import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { BatchPage } from '@/features/empresas/BatchPage';

/** "/empresas/lote/{id}" — painel do RH com os grupos de uma importação (site e app). */
export default function Lote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BatchPage id={String(id ?? '')} />;
}
