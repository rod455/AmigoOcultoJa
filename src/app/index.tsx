import React from 'react';
import { Platform } from 'react-native';
import { LandingPage } from '@/features/landing/LandingPage';
import { StartScreen } from '@/features/start/StartScreen';

/**
 * "/" — no web é a landing page; no app é a tela 1 (Início).
 */
export default function Index() {
  if (Platform.OS === 'web') return <LandingPage />;
  return <StartScreen />;
}
