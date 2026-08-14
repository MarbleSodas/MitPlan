import { Suspense } from 'react';
import AuthCallback from '../../../src/components/auth/AuthCallback';

export default function CallbackPage() {
  return <Suspense fallback={<div>Completing sign in...</div>}><AuthCallback /></Suspense>;
}
