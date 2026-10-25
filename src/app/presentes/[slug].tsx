import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { ContentPage, findPage, pagesOf } from '@/features/conteudo/ContentPage';

/** "/presentes/<slug>" — página de presentes (src/content/paginas/presentes/*.md). Só no site. */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return pagesOf('presentes').map((p) => ({ slug: p.slug }));
}

export default function Presentes() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = findPage('presentes', String(slug ?? ''));
  if (Platform.OS !== 'web' || !page) return <Redirect href="/" />;
  return <ContentPage page={page} />;
}
