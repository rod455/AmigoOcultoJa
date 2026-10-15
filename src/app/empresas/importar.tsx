import { Redirect } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { ImportPage } from '@/features/empresas/ImportPage';

/** "/empresas/importar" — planilha da empresa → um grupo por área (só no web; no app, volta ao início). */
export default function Importar() {
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return <ImportPage />;
}
