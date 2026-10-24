import { Redirect } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { EmpresasPage } from '@/features/landing/EmpresasPage';

/** "/empresas" — página do amigo secreto corporativo. No app, vai direto para o cadastro da empresa, que já explica o passo a passo. */
export default function Empresas() {
  if (Platform.OS !== 'web') return <Redirect href="/empresas/importar" />;
  return <EmpresasPage />;
}
