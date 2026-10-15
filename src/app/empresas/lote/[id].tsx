import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { BatchPage } from '@/features/empresas/BatchPage';

/** "/empresas/lote/{id}" — painel do RH com os grupos de uma importação (só no web). */
export default function Lote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return <BatchPage id={String(id ?? '')} />;
}
