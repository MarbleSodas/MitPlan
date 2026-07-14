import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router';
import { type ReactNode } from 'react';
import { useSession } from '@/lib/supabase';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const session = useSession();
  const location = useLocation();

  if (session.loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!session.user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
};
