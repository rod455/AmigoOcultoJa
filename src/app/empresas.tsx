import { Redirect } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { EmpresasPage } from '@/features/landing/EmpresasPage';

/** "/empresas" — página do amigo secreto corporativo (só no web; no app, volta ao início). */
export default function Empresas() {
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return <EmpresasPage />;
}
