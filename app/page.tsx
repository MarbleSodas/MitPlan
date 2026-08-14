import { Suspense } from 'react';
import { Loading, RootRoute } from '../src/components/routing/AppRouter';

export default function HomePage() {
  return <Suspense fallback={<Loading />}><RootRoute /></Suspense>;
}
