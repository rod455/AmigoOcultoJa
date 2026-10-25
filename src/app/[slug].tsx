import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { ContentPage, findPage, pagesOf } from '@/features/conteudo/ContentPage';

/** "/<slug>" — página de conteúdo (src/content/paginas/*.md). Só no site. */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return pagesOf('raiz').map((p) => ({ slug: p.slug }));
}

export default function Conteudo() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = findPage('raiz', String(slug ?? ''));
  if (Platform.OS !== 'web' || !page) return <Redirect href="/" />;
  return <ContentPage page={page} />;
}
