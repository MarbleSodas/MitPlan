import { Suspense } from 'react';
import { AppRouter, Loading } from '../../src/components/routing/AppRouter';

export default async function RoutedPage({
  params,
}: {
  params: Promise<{ route: string[] }>;
}) {
  const { route } = await params;
  return <Suspense fallback={<Loading />}><AppRouter segments={route} /></Suspense>;
}
